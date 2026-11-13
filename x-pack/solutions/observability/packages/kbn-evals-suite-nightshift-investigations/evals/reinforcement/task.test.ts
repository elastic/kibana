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
import { submitArgumentsEvaluator } from './judges';
import { runReinforcementExample, treesAfterRun } from './task';
import { reinforcementExamples } from './traces';
import type { ReinforcementExample, SubmitArguments } from './types';

jest.mock('timers/promises', () => ({ setTimeout: jest.fn().mockResolvedValue(undefined) }));

const [example] = reinforcementExamples;
const CASE_ID = example.metadata.case_id;
const byCaseId = (caseId: string): ReinforcementExample => {
  const found = reinforcementExamples.find(({ metadata }) => metadata.case_id === caseId);
  if (!found) throw new Error(`No committed round ${caseId}`);
  return found;
};
const seededIdOf = ({ input, metadata }: ReinforcementExample): string => {
  if (!input.prior_tree) throw new Error(`${metadata.case_id} seeds no prior tree`);
  return input.prior_tree.tree_id;
};
const priorMarkdownOf = ({ input }: ReinforcementExample): string | undefined =>
  input.prior_tree?.markdown;
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

const completedWith = (
  submissions: unknown[],
  { turnKind, appliedWrites }: { turnKind?: string; appliedWrites?: unknown[] } = {}
) => ({
  id: EXECUTION_ID,
  status: ExecutionStatus.COMPLETED,
  stepExecutions: [
    ...(turnKind
      ? [
          {
            stepId: 'prepare_turn',
            status: ExecutionStatus.COMPLETED,
            output: { turn_kind: turnKind, skipped: false },
          },
        ]
      : []),
    {
      stepId: 'reinforce_decision_trees',
      status: ExecutionStatus.COMPLETED,
      output: {
        submissions_json: JSON.stringify(submissions),
        ...(appliedWrites ? { applied_writes: appliedWrites } : {}),
      },
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

    const output = await runReinforcementExample({
      esClient,
      fetch: fetch as unknown as HttpHandler,
      connectorId: 'connector',
      example,
    });
    expect(output.execution_error).toContain('Service unavailable');

    const cancelAt = events.indexOf(`fetch:POST ${CANCEL_PATH}`);
    const restoreAt = events.lastIndexOf(`es:delete ${SEEDED_HEAD_ID}`);
    expect(cancelAt).toBeGreaterThan(events.indexOf(`fetch:POST ${RUN_PATH}`));
    expect(restoreAt).toBeGreaterThan(cancelAt);
    expect(readExecution).toHaveBeenCalledTimes(2);
    expect([...docs.keys()]).toEqual([OTHER_HEAD_ID]);
  });

  it('keeps polling through a transient 5xx on an execution read', async () => {
    const events: string[] = [];
    const { esClient } = fakeEsClient(events, {});
    const readExecution = jest
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('no shard available'), { response: { status: 503 } })
      )
      .mockResolvedValue(completedExecution);
    const fetch = fakeFetch(events, { readExecution });

    const output = await runReinforcementExample({
      esClient,
      fetch: fetch as unknown as HttpHandler,
      connectorId: 'connector',
      example,
    });

    expect(readExecution).toHaveBeenCalledTimes(2);
    expect(output.workflow_status).toBe(ExecutionStatus.COMPLETED);
    expect(events).not.toContain(`fetch:POST ${CANCEL_PATH}`);
  });

  it('reports a failed rollback on the run instead of rejecting the experiment', async () => {
    const events: string[] = [];
    const { esClient } = fakeEsClient(events, {});
    jest.mocked(esClient.delete).mockRejectedValue(new Error('delete failed'));
    const log = { warning: jest.fn() };
    const fetch = fakeFetch(events, { readExecution: async () => completedExecution });

    const output = await runReinforcementExample({
      esClient,
      fetch: fetch as unknown as HttpHandler,
      connectorId: 'connector',
      example,
      log,
    });

    expect(output.execution_error).toContain('Rolling back the replay');
    expect(output.rollback_error).toContain('delete failed');
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('delete failed'));
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

    const output = await runReinforcementExample({
      esClient,
      fetch: fetch as unknown as HttpHandler,
      connectorId: 'connector',
      example,
      log,
    });
    expect(output.execution_error).toContain('Service unavailable');

    expect(events.lastIndexOf(`es:delete ${SEEDED_HEAD_ID}`)).toBeGreaterThan(
      events.indexOf(`fetch:POST ${CANCEL_PATH}`)
    );
    expect(docs.size).toBe(0);
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('Cancel failed'));
  });

  it('grades every tree a submit names, read before the rollback', async () => {
    const negativeRound = byCaseId('customer0-es-proxy-unconfirmed-2026-09-14');
    const seededId = seededIdOf(negativeRound);
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
        prior_mermaid: priorMarkdownOf(negativeRound),
        submitted_mermaid: priorMarkdownOf(negativeRound),
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
          { traversals: [{ tree_id: seededIdOf(example), visited_path: ['S1'] }] },
        ]),
    });

    const output = await runReinforcementExample({
      esClient,
      fetch: fetch as unknown as HttpHandler,
      connectorId: 'connector',
      example,
    });

    expect(output.trees?.map(({ tree_id: treeId }) => treeId)).toEqual([seededIdOf(example)]);
  });

  describe('follow-up rounds', () => {
    const followUp = byCaseId('customer0-otel-gateway-followup-confirmed-2026-09-14');

    it('replays the round with its verdict and records what the server ran and wrote', async () => {
      const events: string[] = [];
      const { esClient } = fakeEsClient(events, {});
      const fetch = fakeFetch(events, {
        readExecution: async () =>
          completedWith([], {
            turnKind: 'feedback_reinforcement',
            appliedWrites: [
              {
                store: 'decision_tree',
                item_id: 'symptom:otel-gateway-errors',
                action: 'reinforce',
                after_content: 'tree',
              },
            ],
          }),
      });

      const output = await runReinforcementExample({
        esClient,
        fetch: fetch as unknown as HttpHandler,
        connectorId: 'connector',
        example: followUp,
      });

      expect(runInputs(fetch).replay_causal_confirmed).toBe(true);
      expect(output).toMatchObject({
        turn_kind: 'feedback_reinforcement',
        causal_confirmed: true,
        applied_writes: [
          { store: 'decision_tree', item_id: 'symptom:otel-gateway-errors', action: 'reinforce' },
        ],
      });
      expect(output.applied_writes?.[0]).not.toHaveProperty('after_content');
      expect(output.execution_error).toBeUndefined();
    });

    it('fails the round when the server ran it as a first round', async () => {
      const events: string[] = [];
      const { esClient } = fakeEsClient(events, {});
      const fetch = fakeFetch(events, {
        readExecution: async () => completedWith([], { turnKind: 'initial_investigation' }),
      });

      const output = await runReinforcementExample({
        esClient,
        fetch: fetch as unknown as HttpHandler,
        connectorId: 'connector',
        example: followUp,
      });

      expect(output.turn_kind).toBe('initial_investigation');
      expect(output.execution_error).toContain('replay_causal_confirmed was ignored');
    });

    it('puts back the learning slots it wrote and leaves another writer alone', async () => {
      const events: string[] = [];
      const learning = (content: string, conversationId: string): Source => ({
        type: 'decision_tree_learning',
        content,
        attributes: { space_id: 'default', conversation_id: conversationId },
      });
      const existing = learning('earlier learning', 'earlier-investigation');
      const { esClient, docs } = fakeEsClient(events, {
        'default:dtree_learning_otel-gateway-errors_remediation': existing,
      });
      const fetch: jest.Mock = fakeFetch(events, {
        readExecution: async () => {
          const replayId = replayIdOf(fetch);
          docs.set(
            'default:dtree_learning_otel-gateway-errors_remediation',
            learning('replay learning', replayId)
          );
          docs.set(
            'default:dtree_learning_otel-gateway-errors_system_dependency',
            learning('new replay learning', replayId)
          );
          docs.set(
            'default:dtree_learning_es-proxy-errors_remediation',
            learning('foreign learning', 'other-investigation')
          );
          return completedWith([], { turnKind: 'feedback_reinforcement' });
        },
      });

      const output = await runReinforcementExample({
        esClient,
        fetch: fetch as unknown as HttpHandler,
        connectorId: 'connector',
        example: followUp,
      });

      expect(output.rollback_error).toBeUndefined();
      expect(docs.get('default:dtree_learning_otel-gateway-errors_remediation')).toEqual(existing);
      expect(docs.has('default:dtree_learning_otel-gateway-errors_system_dependency')).toBe(false);
      expect(docs.get('default:dtree_learning_es-proxy-errors_remediation')?.content).toBe(
        'foreign learning'
      );
    });
  });

  it('seeds nothing for a round without a prior tree and grades the tree the run created', async () => {
    const newTreeRound = byCaseId('customer0-uiam-pod-loss-initial-2026-09-14');
    const created = '```mermaid\nflowchart TD\n    S1([uiam 503s]) --> X1((Escalate))\n```';
    const events: string[] = [];
    const { esClient, docs } = fakeEsClient(events, { [OTHER_HEAD_ID]: otherTree });
    const fetch: jest.Mock = fakeFetch(events, {
      readExecution: async () => {
        docs.set('default:dtree_uiam-503s', head('uiam-503s', created, replayIdOf(fetch)));
        return completedWith([
          { symptom_trees: [{ tree_id: 'symptom:uiam-503s' }], traversals: [] },
        ]);
      },
    });

    const output = await runReinforcementExample({
      esClient,
      fetch: fetch as unknown as HttpHandler,
      connectorId: 'connector',
      example: newTreeRound,
    });

    expect(events.filter((event) => event.startsWith('es:index'))).toEqual([]);
    expect(runInputs(fetch)).not.toHaveProperty('replay_causal_confirmed');
    expect(output).toMatchObject({
      tree_id: 'symptom:uiam-503s',
      causal_confirmed: false,
      submitted_mermaid: created,
      trees: [
        { tree_id: 'symptom:uiam-503s', prior_mermaid: undefined, submitted_mermaid: created },
      ],
    });
    expect(output.prior_mermaid).toBeUndefined();
    expect([...docs.keys()]).toEqual([OTHER_HEAD_ID]);
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

      const output = await runReinforcementExample({
        esClient,
        fetch: fetch as unknown as HttpHandler,
        connectorId: 'connector',
        example,
      });
      expect(output.execution_error).toContain('Service unavailable');

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
