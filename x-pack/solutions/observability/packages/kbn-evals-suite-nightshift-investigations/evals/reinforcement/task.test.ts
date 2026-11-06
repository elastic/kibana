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
import { runReinforcementExample } from './task';
import { reinforcementExamples } from './traces';

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
  attributes?: { tree_id?: string; space_id?: string };
};

interface SearchRequest {
  query?: { bool?: { filter?: Array<{ term?: Record<string, unknown> }> } };
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

/** An in-memory decision tree index that records each write in `events`. */
const fakeEsClient = (events: string[], initial: Record<string, Source>) => {
  const docs = new Map<string, Source>(Object.entries(initial));
  const termsOf = (request: SearchRequest): Record<string, unknown> =>
    Object.assign({}, ...(request.query?.bool?.filter ?? []).map(({ term }) => term ?? {}));
  const esClient = {
    get: jest.fn(async ({ id }: { id: string }) => {
      const source = docs.get(id);
      return source ? { found: true, _source: source } : { found: false };
    }),
    search: jest.fn(async (request: SearchRequest) => {
      const terms = termsOf(request);
      const treeId = terms['attributes.tree_id'];
      const hits = [...docs.entries()]
        .filter(
          ([, source]) =>
            source.type === terms.type &&
            source.attributes?.space_id === terms['attributes.space_id'] &&
            (treeId === undefined || source.attributes?.tree_id === treeId)
        )
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

const completedExecution = {
  id: EXECUTION_ID,
  status: ExecutionStatus.COMPLETED,
  stepExecutions: [
    {
      stepId: 'reinforce_decision_trees',
      status: ExecutionStatus.COMPLETED,
      output: { submissions_json: '[]' },
    },
  ],
};

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
});
