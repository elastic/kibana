/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { ExecutionStatus } from '@kbn/workflows';
import { NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID } from '@kbn/workflows/managed';
import { submitArgumentsEvaluator } from './evaluators';
import { runReinforcementExample, treesAfterRun } from './task';
import { reinforcementExamples } from './traces';
import type { SubmitArguments } from './types';

jest.mock('timers/promises', () => ({ setTimeout: jest.fn().mockResolvedValue(undefined) }));

const [example] = reinforcementExamples;
const CASE_ID = example.metadata.case_id;
const SEEDED_HEAD_ID = 'default:dtree_eql-slo-burn-rate';
const OTHER_HEAD_ID = 'default:dtree_checkout-high-latency';
const EXECUTION_ID = 'execution-1';
const RUN_PATH = `/api/workflows/workflow/${NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID}/run`;
const EXECUTION_PATH = `/api/workflows/executions/${EXECUTION_ID}`;
const CANCEL_PATH = `${EXECUTION_PATH}/cancel`;

type Source = Record<string, unknown> & {
  type?: string;
  attributes?: {
    tree_id?: string;
    space_id?: string;
    conversation_id?: string;
    counts_conversation_id?: string;
    version?: number;
  };
};

interface SearchRequest {
  query?: {
    bool?: {
      filter?: Array<{ term?: Record<string, unknown>; terms?: Record<string, unknown[]> }>;
    };
  };
}

interface FetchOptions {
  method?: string;
  body?: string;
}

const otherTree: Source = {
  type: 'decision_tree',
  content: 'checkout tree',
  attributes: { tree_id: 'symptom:checkout-high-latency', space_id: 'default' },
};

const fieldOf = (source: Source, field: string): unknown =>
  field
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
      source
    );

/** An in-memory decision tree index that records each write in `events`. */
const fakeEsClient = (events: string[], initial: Record<string, Source>) => {
  const docs = new Map<string, Source>(Object.entries(initial));
  const matches = (request: SearchRequest, source: Source): boolean =>
    (request.query?.bool?.filter ?? []).every(({ term = {}, terms = {} }) =>
      [
        ...Object.entries(term).map(([field, value]) => fieldOf(source, field) === value),
        ...Object.entries(terms).map(([field, values]) => values.includes(fieldOf(source, field))),
      ].every(Boolean)
    );
  const esClient = {
    get: jest.fn(async ({ id }: { id: string }) => {
      const source = docs.get(id);
      return source ? { found: true, _source: source } : { found: false };
    }),
    search: jest.fn(async (request: SearchRequest) => {
      const hits = [...docs.entries()]
        .filter(([, source]) => matches(request, source))
        .map(([id, source]) => ({ _id: id, _source: source }));
      return { hits: { hits } };
    }),
    index: jest.fn(async ({ id, document }: { id: string; document: Source }) => {
      events.push(`es:index ${id}`);
      docs.set(id, document);
      return {};
    }),
    delete: jest.fn(async ({ id }: { id: string }) => {
      events.push(`es:delete ${id}`);
      docs.delete(id);
      return {};
    }),
  };
  return { esClient: esClient as unknown as Client, docs };
};

const completedWith = (submissions: unknown[]) => ({
  id: EXECUTION_ID,
  status: ExecutionStatus.COMPLETED,
  stepExecutions: [
    {
      stepId: 'reinforce_decision_trees',
      status: ExecutionStatus.COMPLETED,
      output: { submissions_json: JSON.stringify(submissions) },
    },
  ],
});

const completedExecution = completedWith([]);

const head = (symptom: string, content: string, conversationId?: string): Source => ({
  type: 'decision_tree',
  content,
  attributes: {
    tree_id: `symptom:${symptom}`,
    space_id: 'default',
    ...(conversationId ? { conversation_id: conversationId } : {}),
  },
});

const version = (symptom: string, content: string, conversationId?: string): Source => ({
  ...head(symptom, content, conversationId),
  type: 'decision_tree_version',
});

const fakeFetch = (
  events: string[],
  {
    readExecution,
    cancel = async () => ({}),
  }: {
    readExecution: () => Promise<unknown>;
    cancel?: () => Promise<unknown>;
  }
) => {
  const fetch = jest.fn(async (path: string, { method = 'GET' }: FetchOptions = {}) => {
    events.push(`fetch:${method} ${path}`);
    if (method === 'POST' && path === RUN_PATH) return { workflowExecutionId: EXECUTION_ID };
    if (method === 'POST' && path === CANCEL_PATH) return cancel();
    if (method === 'GET' && path === EXECUTION_PATH) return readExecution();
    throw new Error(`Unexpected ${method} ${path}`);
  });
  return fetch;
};

/** The conversation id the replay was started with, which stamps every tree it writes. */
const replayIdOf = (fetch: jest.Mock): string => String(runInputs(fetch).conversation_id);

const runInputs = (fetch: jest.Mock): Record<string, unknown> => {
  const [, options] = fetch.mock.calls.find(([path]) => path === RUN_PATH) ?? [];
  return (JSON.parse((options as FetchOptions).body ?? '{}') as { inputs: Record<string, unknown> })
    .inputs;
};

describe('runReinforcementExample', () => {
  it('runs the replay as a new conversation keyed by the case id', async () => {
    const events: string[] = [];
    const { esClient } = fakeEsClient(events, {});
    const fetch = fakeFetch(events, { readExecution: async () => completedExecution });

    const output = await runReinforcementExample({
      esClient,
      fetch: fetch as unknown as HttpHandler,
      connectorId: 'connector',
      example,
    });

    const inputs = runInputs(fetch);
    expect(inputs.replay).toBe(true);
    expect(inputs.round_id).toBe(CASE_ID);
    expect(String(inputs.conversation_id)).toMatch(
      new RegExp(`^nightshift-reinforcement-replay-${CASE_ID}-[0-9a-f-]{36}$`)
    );
    expect(String(inputs.conversation_id).length).toBeLessThanOrEqual(512);
    expect(output.workflow_status).toBe(ExecutionStatus.COMPLETED);
    expect(events).not.toContain(`fetch:POST ${CANCEL_PATH}`);
  });

  it('keeps a long case id within the conversation id limit', async () => {
    const events: string[] = [];
    const { esClient } = fakeEsClient(events, {});
    const fetch = fakeFetch(events, { readExecution: async () => completedExecution });
    const longCaseId = 'c'.repeat(600);

    await runReinforcementExample({
      esClient,
      fetch: fetch as unknown as HttpHandler,
      connectorId: 'connector',
      example: { ...example, metadata: { ...example.metadata, case_id: longCaseId } },
    });

    const conversationId = String(runInputs(fetch).conversation_id);
    expect(conversationId).toHaveLength(512);
    expect(conversationId.startsWith('nightshift-reinforcement-replay-ccc')).toBe(true);
  });

  it('cancels an execution it stopped reading before restoring the trees', async () => {
    const events: string[] = [];
    const { esClient, docs } = fakeEsClient(events, { [OTHER_HEAD_ID]: otherTree });
    const readExecution = jest
      .fn()
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValue({ id: EXECUTION_ID, status: ExecutionStatus.CANCELLED });
    const fetch = fakeFetch(events, { readExecution });

    await expect(
      runReinforcementExample({
        esClient,
        fetch: fetch as unknown as HttpHandler,
        connectorId: 'connector',
        example,
      })
    ).rejects.toThrow('Service unavailable');

    const cancelAt = events.indexOf(`fetch:POST ${CANCEL_PATH}`);
    const restoreAt = events.lastIndexOf(`es:delete ${SEEDED_HEAD_ID}`);
    expect(cancelAt).toBeGreaterThan(events.indexOf(`fetch:POST ${RUN_PATH}`));
    expect(restoreAt).toBeGreaterThan(cancelAt);
    expect(readExecution).toHaveBeenCalledTimes(2);
    expect([...docs.keys()]).toEqual([OTHER_HEAD_ID]);
  });

  it('cancels an execution that is still running when the wait runs out', async () => {
    const events: string[] = [];
    const { esClient, docs } = fakeEsClient(events, {});
    let now = 0;
    const clock = jest.spyOn(Date, 'now').mockImplementation(() => (now += 10 * 60_000));
    const fetch = fakeFetch(events, {
      readExecution: async () => ({
        id: EXECUTION_ID,
        status: events.includes(`fetch:POST ${CANCEL_PATH}`)
          ? ExecutionStatus.CANCELLED
          : ExecutionStatus.RUNNING,
      }),
    });

    try {
      const output = await runReinforcementExample({
        esClient,
        fetch: fetch as unknown as HttpHandler,
        connectorId: 'connector',
        example,
      });
      expect(output.workflow_status).toBe(ExecutionStatus.RUNNING);
      expect(output.execution_error).toBeDefined();
    } finally {
      clock.mockRestore();
    }

    expect(events.lastIndexOf(`es:delete ${SEEDED_HEAD_ID}`)).toBeGreaterThan(
      events.indexOf(`fetch:POST ${CANCEL_PATH}`)
    );
    expect(events.indexOf(`fetch:POST ${CANCEL_PATH}`)).toBeGreaterThan(-1);
    expect(docs.size).toBe(0);
  });

  it('still restores the trees when the cancel fails', async () => {
    const events: string[] = [];
    const { esClient, docs } = fakeEsClient(events, {});
    const log = { warning: jest.fn() };
    const fetch = fakeFetch(events, {
      readExecution: async () => {
        throw new Error('Service unavailable');
      },
      cancel: async () => {
        throw new Error('Cancel failed');
      },
    });

    await expect(
      runReinforcementExample({
        esClient,
        fetch: fetch as unknown as HttpHandler,
        connectorId: 'connector',
        example,
        log,
      })
    ).rejects.toThrow('Service unavailable');

    expect(events.lastIndexOf(`es:delete ${SEEDED_HEAD_ID}`)).toBeGreaterThan(
      events.indexOf(`fetch:POST ${CANCEL_PATH}`)
    );
    expect(docs.size).toBe(0);
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('Cancel failed'));
  });

  it('grades every tree a submit names, read before the rollback', async () => {
    const negativeRound = reinforcementExamples[3];
    const seededId = negativeRound.input.prior_tree.tree_id;
    const editedCheckout = [
      '```mermaid',
      'flowchart TD',
      '    S1([Checkout latency]) --> E1[Read traces]',
      '    E1 --> X1((Escalate))',
      '```',
    ].join('\n');
    const events: string[] = [];
    const { esClient, docs } = fakeEsClient(events, { [OTHER_HEAD_ID]: otherTree });
    const fetch: jest.Mock = fakeFetch(events, {
      readExecution: async () => {
        docs.set(OTHER_HEAD_ID, {
          ...otherTree,
          content: editedCheckout,
          attributes: { ...otherTree.attributes, conversation_id: replayIdOf(fetch) },
        });
        // The seeded tree has a valid traversal. The other tree is edited without one.
        return completedWith([
          {
            symptom_trees: [{ tree_id: 'checkout-high-latency' }],
            traversals: [{ tree_id: seededId, visited_path: ['S1', 'E1'] }],
          },
        ]);
      },
    });

    const output = await runReinforcementExample({
      esClient,
      fetch: fetch as unknown as HttpHandler,
      connectorId: 'connector',
      example: negativeRound,
    });

    expect(output.trees).toEqual([
      {
        tree_id: seededId,
        prior_mermaid: negativeRound.input.prior_tree.markdown,
        submitted_mermaid: negativeRound.input.prior_tree.markdown,
      },
      {
        tree_id: 'symptom:checkout-high-latency',
        prior_mermaid: 'checkout tree',
        submitted_mermaid: editedCheckout,
      },
    ]);
    expect(docs.get(OTHER_HEAD_ID)).toEqual(otherTree);

    const graded = await submitArgumentsEvaluator.evaluate({
      input: negativeRound.input,
      output,
      expected: undefined,
      metadata: negativeRound.metadata,
    });
    expect(graded.explanation).toContain('no traversal for symptom:checkout-high-latency');
    expect(graded.score).toBe(0);
  });

  it('leaves out a tree named only by a rejected submit the retry corrected', async () => {
    const events: string[] = [];
    const { esClient } = fakeEsClient(events, {});
    const fetch = fakeFetch(events, {
      readExecution: async () =>
        completedWith([
          { traversals: [{ tree_id: 'symptom:eql-slo-burn-rat', visited_path: ['S1'] }] },
          { traversals: [{ tree_id: example.input.prior_tree.tree_id, visited_path: ['S1'] }] },
        ]),
    });

    const output = await runReinforcementExample({
      esClient,
      fetch: fetch as unknown as HttpHandler,
      connectorId: 'connector',
      example,
    });

    expect(output.trees?.map(({ tree_id: treeId }) => treeId)).toEqual([
      example.input.prior_tree.tree_id,
    ]);
  });

  describe('rollback', () => {
    it('leaves alone a tree another investigation writes during the replay', async () => {
      const events: string[] = [];
      const { esClient, docs } = fakeEsClient(events, { [OTHER_HEAD_ID]: otherTree });
      const fetch = fakeFetch(events, {
        readExecution: async () => {
          docs.set('default:dtree_foreign', head('foreign', 'foreign tree', 'other-investigation'));
          docs.set(
            'default:dtree_foreign_v1',
            version('foreign', 'foreign tree', 'other-investigation')
          );
          docs.set(OTHER_HEAD_ID, { ...otherTree, content: 'updated by another investigation' });
          return completedExecution;
        },
      });

      await runReinforcementExample({
        esClient,
        fetch: fetch as unknown as HttpHandler,
        connectorId: 'connector',
        example,
      });

      expect([...docs.keys()].sort()).toEqual(
        [OTHER_HEAD_ID, 'default:dtree_foreign', 'default:dtree_foreign_v1'].sort()
      );
      expect(docs.get(OTHER_HEAD_ID)?.content).toBe('updated by another investigation');
    });

    it('restores a pre-existing tree it committed and deletes one it created', async () => {
      const events: string[] = [];
      const { esClient, docs } = fakeEsClient(events, { [OTHER_HEAD_ID]: otherTree });
      const fetch: jest.Mock = fakeFetch(events, {
        readExecution: async () => {
          const replayId = replayIdOf(fetch);
          docs.set(OTHER_HEAD_ID, head('checkout-high-latency', 'replay edit', replayId));
          docs.set(
            `${OTHER_HEAD_ID}_v2`,
            version('checkout-high-latency', 'replay edit', replayId)
          );
          docs.set(
            'default:dtree_created-by-replay',
            head('created-by-replay', 'new tree', replayId)
          );
          return completedWith([
            // A bare slug names the same tree as its `symptom:` id.
            { symptom_trees: [{ tree_id: 'checkout-high-latency' }] },
            { traversals: [{ tree_id: 'symptom:created-by-replay', visited_path: ['a', 'b'] }] },
          ]);
        },
      });

      await runReinforcementExample({
        esClient,
        fetch: fetch as unknown as HttpHandler,
        connectorId: 'connector',
        example,
      });

      expect([...docs.keys()]).toEqual([OTHER_HEAD_ID]);
      expect(docs.get(OTHER_HEAD_ID)).toEqual(otherTree);
    });

    // A rejected submit can name a tree it never wrote; that tree is someone else's.
    it('leaves alone a tree a submit named but another investigation wrote', async () => {
      const events: string[] = [];
      const { esClient, docs } = fakeEsClient(events, { [OTHER_HEAD_ID]: otherTree });
      const foreign = head('checkout-high-latency', 'other investigation', 'other-investigation');
      const fetch = fakeFetch(events, {
        readExecution: async () => {
          docs.set(OTHER_HEAD_ID, foreign);
          return completedWith([{ symptom_trees: [{ tree_id: 'checkout-high-latency' }] }]);
        },
      });

      await runReinforcementExample({
        esClient,
        fetch: fetch as unknown as HttpHandler,
        connectorId: 'connector',
        example,
      });

      expect(docs.get(OTHER_HEAD_ID)).toEqual(foreign);
    });

    it('restores a tree it only knows about from its conversation id provenance', async () => {
      const events: string[] = [];
      const original = head('stamped', 'original');
      const { esClient, docs } = fakeEsClient(events, { 'default:dtree_stamped': original });
      const fetch: jest.Mock = fakeFetch(events, {
        readExecution: async () => {
          const conversationId = String(runInputs(fetch).conversation_id);
          docs.set('default:dtree_stamped', head('stamped', 'replay edit', conversationId));
          docs.set('default:dtree_stamped_v1', version('stamped', 'replay edit', conversationId));
          // A version written before its head is still the replay's.
          docs.set('default:dtree_version-only_v1', version('version-only', 'new', conversationId));
          return completedExecution;
        },
      });

      await runReinforcementExample({
        esClient,
        fetch: fetch as unknown as HttpHandler,
        connectorId: 'connector',
        example,
      });

      expect([...docs.keys()]).toEqual(['default:dtree_stamped']);
      expect(docs.get('default:dtree_stamped')).toEqual(original);
    });

    it('rolls back its own counts-only traversal but not another tree when the replay fails', async () => {
      const events: string[] = [];
      const foreignBefore = head('foreign', 'foreign tree');
      const { esClient, docs } = fakeEsClient(events, {
        [OTHER_HEAD_ID]: otherTree,
        'default:dtree_foreign': foreignBefore,
      });
      const readExecution = jest
        .fn()
        .mockImplementationOnce(async () => {
          const conversationId = String(runInputs(fetch).conversation_id);
          // A traversal of an unedited tree rewrites only its head counts and names its writer there.
          docs.set(OTHER_HEAD_ID, {
            ...otherTree,
            attributes: { ...otherTree.attributes, counts_conversation_id: conversationId },
            counts: { nodes: [] },
          });
          docs.set('default:dtree_foreign', head('foreign', 'edited by another investigation'));
          throw new Error('Service unavailable');
        })
        .mockResolvedValue({ id: EXECUTION_ID, status: ExecutionStatus.CANCELLED });
      const fetch: jest.Mock = fakeFetch(events, { readExecution });

      await expect(
        runReinforcementExample({
          esClient,
          fetch: fetch as unknown as HttpHandler,
          connectorId: 'connector',
          example,
        })
      ).rejects.toThrow('Service unavailable');

      expect(docs.get(OTHER_HEAD_ID)).toEqual(otherTree);
      expect(docs.get('default:dtree_foreign')?.content).toBe('edited by another investigation');
    });
  });
});

describe('treesAfterRun', () => {
  const RUN = 'investigation-conversation';
  const OTHER = 'earlier-conversation';
  const treeDoc = (content: string, treeVersion: number, conversationId?: string): Source => ({
    content,
    attributes: {
      version: treeVersion,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    },
  });
  const naming = (...treeIds: string[]) =>
    ({
      summary: 'test',
      symptom_trees: [],
      traversals: treeIds.map((tree_id) => ({
        tree_id,
        visited_path: ['S1', 'E1'],
        causal_path: [],
      })),
    } as unknown as SubmitArguments);

  it('fails rather than skip a tree whose provenance it could not read', async () => {
    const { esClient } = fakeEsClient([], {});
    jest
      .mocked(esClient.get)
      .mockRejectedValueOnce(Object.assign(new Error('unavailable'), { statusCode: 503 }));

    await expect(
      treesAfterRun(esClient, [naming('symptom:gateway'), naming('symptom:proxy')], RUN)
    ).rejects.toThrow('unavailable');
  });

  it('skips a tree named only by a rejected submit when its head is missing', async () => {
    const { esClient } = fakeEsClient([], {});
    jest
      .mocked(esClient.get)
      .mockRejectedValueOnce(Object.assign(new Error('not found'), { statusCode: 404 }));

    await expect(
      treesAfterRun(esClient, [naming('symptom:gateway'), naming('symptom:proxy')], RUN)
    ).resolves.toEqual([
      { tree_id: 'symptom:proxy', prior_mermaid: undefined, submitted_mermaid: undefined },
    ]);
  });

  it('grades against the version before the run, skipping every commit the run made', async () => {
    const { esClient } = fakeEsClient([], {
      'default:dtree_gateway': treeDoc('v3', 3, RUN),
      'default:dtree_gateway_v2': treeDoc('v2', 2, RUN),
      'default:dtree_gateway_v1': treeDoc('v1', 1, OTHER),
    });
    await expect(treesAfterRun(esClient, [naming('symptom:gateway')], RUN)).resolves.toEqual([
      { tree_id: 'symptom:gateway', prior_mermaid: 'v1', submitted_mermaid: 'v3' },
    ]);
  });

  it('keeps a predecessor another conversation committed just before the run as the baseline', async () => {
    const { esClient } = fakeEsClient([], {
      'default:dtree_gateway': treeDoc('v2', 2, RUN),
      'default:dtree_gateway_v1': {
        ...treeDoc('v1', 1, OTHER),
        '@timestamp': new Date().toISOString(),
      },
    });
    const [tree] = await treesAfterRun(esClient, [naming('symptom:gateway')], RUN);
    expect(tree.prior_mermaid).toBe('v1');
  });

  it('has no prior when the run created the tree', async () => {
    const { esClient } = fakeEsClient([], {
      'default:dtree_gateway': treeDoc('v2', 2, RUN),
      'default:dtree_gateway_v1': treeDoc('v1', 1, RUN),
    });
    const [tree] = await treesAfterRun(esClient, [naming('symptom:gateway')], RUN);
    expect(tree.prior_mermaid).toBeUndefined();
  });

  it('skips a tree only a rejected earlier submit named', async () => {
    const { esClient } = fakeEsClient([], {
      'default:dtree_gateway': treeDoc('v2', 2, RUN),
      'default:dtree_gateway_v1': treeDoc('v1', 1, OTHER),
    });
    const trees = await treesAfterRun(
      esClient,
      [naming('symptom:gatewy'), naming('symptom:gateway')],
      RUN
    );
    expect(trees.map(({ tree_id: treeId }) => treeId)).toEqual(['symptom:gateway']);
  });

  it('keeps trees an earlier submit committed or counted when a retry names only another tree', async () => {
    const { esClient } = fakeEsClient([], {
      'default:dtree_proxy': treeDoc('proxy v2', 2, RUN),
      'default:dtree_proxy_v1': treeDoc('proxy v1', 1, OTHER),
      'default:dtree_slo': {
        ...treeDoc('slo v1', 1, OTHER),
        attributes: { version: 1, conversation_id: OTHER, counts_conversation_id: RUN },
      },
      'default:dtree_gateway': treeDoc('gateway v1', 1, OTHER),
    });
    const trees = await treesAfterRun(
      esClient,
      [naming('symptom:proxy', 'symptom:slo'), naming('symptom:gateway')],
      RUN
    );
    expect(trees).toEqual([
      { tree_id: 'symptom:proxy', prior_mermaid: 'proxy v1', submitted_mermaid: 'proxy v2' },
      { tree_id: 'symptom:slo', prior_mermaid: 'slo v1', submitted_mermaid: 'slo v1' },
      { tree_id: 'symptom:gateway', prior_mermaid: 'gateway v1', submitted_mermaid: 'gateway v1' },
    ]);
  });
});
