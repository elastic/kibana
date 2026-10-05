/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import {
  didToolCallReturnRows,
  extractOrderedToolCalls,
  getToolCallCount,
  extractToolCallIds,
  summarizeEsqlGrounding,
  extractEventSearchCandidateCount,
  summarizePersistenceCalls,
} from './tool_usage';

const TOOL_ID_EXECUTE_ESQL = platformCoreTools.executeEsql;
const TOOL_ID_KI_SEARCH = platformSignificantEventsTools.searchKnowledgeIndicators;
const TOOL_ID_EVENT_SEARCH = platformSignificantEventsTools.searchEvent;

const steps: ConverseStep[] = [
  { type: 'reasoning', reasoning: 'plan' },
  {
    type: 'tool_call',
    tool_id: TOOL_ID_KI_SEARCH,
    tool_call_id: 'ki-1',
    tool_call_group_id: 'ki-group',
    params: { kind: ['feature', 'query'], stream_names: ['logs'] },
    results: [{ type: 'other', data: { knowledge_indicators: [{ kind: 'query' }] } }],
  },
  {
    type: 'tool_call',
    tool_id: TOOL_ID_EXECUTE_ESQL,
    tool_call_id: 'esql-1',
    tool_call_group_id: 'esql-group',
    params: { query: 'FROM logs | WHERE body.text : "SQLState"' },
    results: [
      { type: 'query', data: { esql: '…' } },
      { type: 'esql_results', data: { columns: [{ name: '@timestamp' }], values: [['t', 'x']] } },
    ],
  },
  {
    type: 'tool_call',
    tool_id: TOOL_ID_EXECUTE_ESQL,
    tool_call_id: 'esql-2',
    tool_call_group_id: 'esql-group',
    params: { query: 'FROM logs | WHERE body.text : "Cache error"' },
    results: [{ type: 'esql_results', data: { columns: [{ name: '@timestamp' }], values: [] } }],
  },
];

describe('extractToolCallIds', () => {
  it('returns tool ids of tool_call steps in order, skipping reasoning', () => {
    expect(extractToolCallIds(steps)).toEqual([
      TOOL_ID_KI_SEARCH,
      TOOL_ID_EXECUTE_ESQL,
      TOOL_ID_EXECUTE_ESQL,
    ]);
  });
});

describe('extractOrderedToolCalls', () => {
  it('preserves step order, parameters, results, and parallel group IDs', () => {
    const calls = extractOrderedToolCalls(steps);

    expect(calls[0]).toMatchObject({
      index: 1,
      toolId: TOOL_ID_KI_SEARCH,
      groupId: 'ki-group',
      params: { kind: ['feature', 'query'], stream_names: ['logs'] },
    });
    expect(didToolCallReturnRows(calls[1])).toBe(true);
    expect(didToolCallReturnRows(calls[2])).toBe(false);
  });
});

describe('getToolCallCount', () => {
  it('counts only tool_call steps', () => {
    expect(getToolCallCount(steps)).toBe(3);
  });
});

describe('summarizePersistenceCalls', () => {
  const persistenceToolId = platformSignificantEventsTools.eventsWrite;
  const writeCall = ({
    id,
    items,
    itemResults,
    groupId,
  }: {
    id: string;
    items?: Array<Record<string, unknown>>;
    itemResults?: Array<Record<string, unknown>>;
    groupId?: string;
  }): ConverseStep => ({
    type: 'tool_call',
    tool_id: persistenceToolId,
    tool_call_id: id,
    ...(groupId !== undefined ? { tool_call_group_id: groupId } : {}),
    ...(items !== undefined ? { params: { items } } : {}),
    ...(itemResults !== undefined ? { results: [{ data: { results: itemResults } }] } : {}),
  });
  const itemResult = (
    index: number,
    reason: 'bulk_error' | 'unknown_event_id' | undefined
  ): Record<string, unknown> =>
    reason === undefined ? { index, written: true } : { index, written: false, reason };
  const summarize = (calls: ConverseStep[]) => summarizePersistenceCalls(calls, persistenceToolId);

  it('accepts one persistence call', () => {
    expect(summarize([writeCall({ id: 'write-1' })])).toEqual({
      count: 1,
      valid: true,
      retriedPartialFailure: false,
      retriedSchemaFailure: false,
    });
  });

  it('accepts exactly one retry after an item-level bulk error', () => {
    const failedItem = { event_id: 'failed-event', status: 'active', title: 'Failed event' };
    expect(
      summarize([
        writeCall({
          id: 'write-1',
          items: [failedItem],
          itemResults: [itemResult(0, 'bulk_error')],
        }),
        writeCall({ id: 'write-2', items: [failedItem] }),
      ])
    ).toEqual({
      count: 2,
      valid: true,
      retriedPartialFailure: true,
      retriedSchemaFailure: false,
    });
  });

  it('rejects an item retry from the same parallel call group', () => {
    const failedItem = { event_id: 'failed-event', status: 'active', title: 'Failed event' };
    expect(
      summarize([
        writeCall({
          id: 'write-1',
          groupId: 'parallel-writes',
          items: [failedItem],
          itemResults: [itemResult(0, 'bulk_error')],
        }),
        writeCall({
          id: 'write-2',
          groupId: 'parallel-writes',
          items: [failedItem],
        }),
      ])
    ).toMatchObject({ valid: false, retriedPartialFailure: false });
  });

  it('rejects repeated calls without a partial bulk failure', () => {
    expect(summarize([writeCall({ id: 'write-1' }), writeCall({ id: 'write-2' })])).toEqual({
      count: 2,
      valid: false,
      retriedPartialFailure: false,
      retriedSchemaFailure: false,
    });
  });

  it('accepts exactly one retry after a schema or tool error', () => {
    expect(
      summarize([
        {
          type: 'tool_call',
          tool_id: persistenceToolId,
          tool_call_id: 'write-1',
          params: {},
          results: [{ type: 'error', data: { message: 'Pass items as a non-empty array' } }],
        },
        writeCall({ id: 'write-2', items: [{ event_id: 'event-1' }] }),
      ])
    ).toEqual({ count: 2, valid: true, retriedPartialFailure: false, retriedSchemaFailure: true });
  });

  it('rejects a schema recovery call from the same parallel call group', () => {
    expect(
      summarize([
        {
          type: 'tool_call',
          tool_id: persistenceToolId,
          tool_call_id: 'write-1',
          tool_call_group_id: 'parallel-writes',
          params: {},
          results: [{ type: 'error', data: { message: 'Pass items as a non-empty array' } }],
        },
        writeCall({
          id: 'write-2',
          groupId: 'parallel-writes',
          items: [{ event_id: 'event-1' }],
        }),
      ])
    ).toMatchObject({ valid: false, retriedSchemaFailure: false });
  });

  it('rejects a retry that resubmits more than the failed items', () => {
    const failedItem = { event_id: 'failed-event', title: 'Failed' };
    const successfulItem = { event_id: 'successful-event', title: 'Successful' };
    expect(
      summarize([
        writeCall({
          id: 'write-1',
          items: [failedItem, successfulItem],
          itemResults: [itemResult(0, 'bulk_error'), itemResult(1, undefined)],
        }),
        writeCall({ id: 'write-2', items: [failedItem, successfulItem] }),
      ])
    ).toEqual({
      count: 2,
      valid: false,
      retriedPartialFailure: false,
      retriedSchemaFailure: false,
    });
  });

  it('accepts an unknown event id retry with the id removed and all other fields unchanged', () => {
    const signal = { type: 'detection', metadata: { rule_uuid: 'rule-x' } };
    const failedItem = {
      event_id: 'unknown-id',
      status: 'active',
      title: 'Event X',
      signals: [signal],
    };
    const { event_id: _, ...retryItem } = failedItem;

    expect(
      summarize([
        writeCall({
          id: 'write-1',
          items: [failedItem],
          itemResults: [itemResult(0, 'unknown_event_id')],
        }),
        writeCall({ id: 'write-2', items: [retryItem] }),
      ])
    ).toMatchObject({ valid: true, retriedPartialFailure: true });
  });

  it('rejects retrying a successful item in place of the failed item', () => {
    const failedItem = { event_id: 'event-x', title: 'X' };
    const successfulItem = { event_id: 'event-y', title: 'Y' };

    expect(
      summarize([
        writeCall({
          id: 'write-1',
          items: [failedItem, successfulItem],
          itemResults: [itemResult(0, 'bulk_error'), itemResult(1, undefined)],
        }),
        writeCall({ id: 'write-2', items: [successfulItem] }),
      ])
    ).toMatchObject({ valid: false, retriedPartialFailure: false });
  });

  it('rejects a retry that omits one retryable failure', () => {
    const failedX = { event_id: 'event-x', title: 'X' };
    const failedZ = { event_id: 'event-z', title: 'Z' };

    expect(
      summarize([
        writeCall({
          id: 'write-1',
          items: [failedX, failedZ],
          itemResults: [itemResult(0, 'bulk_error'), itemResult(1, 'bulk_error')],
        }),
        writeCall({ id: 'write-2', items: [failedX] }),
      ])
    ).toMatchObject({ valid: false, retriedPartialFailure: false });
  });

  it('pairs an unknown event id retry that has no detection rules', () => {
    const failedItem = { event_id: 'unknown-id', status: 'dismissed', title: 'No rules' };
    const retryItem = { status: 'dismissed', title: 'No rules' };

    expect(
      summarize([
        writeCall({
          id: 'write-1',
          items: [failedItem],
          itemResults: [itemResult(0, 'unknown_event_id')],
        }),
        writeCall({ id: 'write-2', items: [retryItem] }),
      ])
    ).toMatchObject({ valid: true, retriedPartialFailure: true });
  });

  it('rejects a bulk error retry that changes an input field', () => {
    const failedItem = { event_id: 'event-x', status: 'active', title: 'Original' };

    expect(
      summarize([
        writeCall({
          id: 'write-1',
          items: [failedItem],
          itemResults: [itemResult(0, 'bulk_error')],
        }),
        writeCall({ id: 'write-2', items: [{ ...failedItem, title: 'Changed' }] }),
      ])
    ).toMatchObject({ valid: false, retriedPartialFailure: false });
  });

  it('rejects an unknown event id retry that repeats the rejected id', () => {
    const failedItem = { event_id: 'unknown-id', status: 'active', title: 'Event X' };

    expect(
      summarize([
        writeCall({
          id: 'write-1',
          items: [failedItem],
          itemResults: [itemResult(0, 'unknown_event_id')],
        }),
        writeCall({ id: 'write-2', items: [failedItem] }),
      ])
    ).toMatchObject({ valid: false, retriedPartialFailure: false });
  });

  it('rejects swapping two rejected ids between otherwise identical items', () => {
    const failedA = { event_id: 'unknown-a', status: 'active', title: 'Same event' };
    const failedB = { event_id: 'unknown-b', status: 'active', title: 'Same event' };
    const search: ConverseStep = {
      type: 'tool_call',
      tool_id: TOOL_ID_EVENT_SEARCH,
      tool_call_id: 'search-1',
      tool_call_group_id: 'search-group',
      results: [
        {
          data: {
            events: [
              { event_id: 'unknown-a', status: 'active' },
              { event_id: 'unknown-b', status: 'active' },
            ],
          },
        },
      ],
    };

    expect(
      summarize([
        search,
        writeCall({
          id: 'write-1',
          groupId: 'write-group',
          items: [failedA, failedB],
          itemResults: [itemResult(0, 'unknown_event_id'), itemResult(1, 'unknown_event_id')],
        }),
        writeCall({
          id: 'write-2',
          groupId: 'retry-group',
          items: [
            { ...failedA, event_id: 'unknown-b' },
            { ...failedB, event_id: 'unknown-a' },
          ],
        }),
      ])
    ).toMatchObject({ valid: false, retriedPartialFailure: false });
  });

  it.each<[string, string, string, boolean]>([
    ['an active id from an earlier search group', 'known-active-id', 'retry-group', true],
    ['a freshly invented id', 'invented-id', 'retry-group', false],
    ['an active id from the retry call group', 'known-active-id', 'shared-group', false],
  ])('handles corrected unknown ids using %s', (_, retryEventId, retryGroupId, expectedValid) => {
    const failedItem = { event_id: 'unknown-id', status: 'active', title: 'Event X' };
    const search: ConverseStep = {
      type: 'tool_call',
      tool_id: TOOL_ID_EVENT_SEARCH,
      tool_call_id: 'search-1',
      tool_call_group_id: 'shared-group',
      results: [
        { data: { events: [{ event_id: 'known-active-id', status: 'active' }], total: 1 } },
      ],
    };

    expect(
      summarize([
        search,
        writeCall({
          id: 'write-1',
          groupId: 'write-group',
          items: [failedItem],
          itemResults: [itemResult(0, 'unknown_event_id')],
        }),
        writeCall({
          id: 'write-2',
          groupId: retryGroupId,
          items: [{ ...failedItem, event_id: retryEventId }],
        }),
      ])
    ).toMatchObject({ valid: expectedValid, retriedPartialFailure: expectedValid });
  });

  it('rejects a second call that only resends successful first-call items', () => {
    const successfulItem = { event_id: 'successful-event', status: 'active' };

    expect(
      summarize([
        writeCall({
          id: 'write-1',
          items: [successfulItem],
          itemResults: [itemResult(0, undefined)],
        }),
        writeCall({ id: 'write-2', items: [successfulItem] }),
      ])
    ).toMatchObject({ valid: false, retriedPartialFailure: false });
  });
});

describe('summarizeEsqlGrounding', () => {
  it('counts execute_esql calls and how many returned rows', () => {
    expect(summarizeEsqlGrounding(steps)).toEqual({
      noOfToolCalls: 2,
      noOfToolCallsWithResults: 1,
    });
  });

  it('reports zero calls when execute_esql was never invoked', () => {
    expect(summarizeEsqlGrounding([{ type: 'tool_call', tool_id: TOOL_ID_KI_SEARCH }])).toEqual({
      noOfToolCalls: 0,
      noOfToolCallsWithResults: 0,
    });
  });
});

describe('extractEventSearchCandidateCount', () => {
  it('returns null when event_search was never called', () => {
    expect(extractEventSearchCandidateCount(steps)).toBeNull();
  });

  it('reads the candidate count from data.total when present', () => {
    const withEventSearch: ConverseStep[] = [
      ...steps,
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENT_SEARCH,
        tool_call_id: 'event-search-1',
        params: { state: 'active', stream_names: ['logs'] },
        results: [{ type: 'other', data: { events: [{ event_id: 'a' }], total: 1 } }],
      },
    ];
    expect(extractEventSearchCandidateCount(withEventSearch)).toBe(1);
  });

  it('falls back to events.length when data.total is absent', () => {
    const withEventSearch: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENT_SEARCH,
        tool_call_id: 'event-search-1',
        params: { state: 'active', stream_names: ['logs'] },
        results: [{ type: 'other', data: { events: [{ event_id: 'a' }, { event_id: 'b' }] } }],
      },
    ];
    expect(extractEventSearchCandidateCount(withEventSearch)).toBe(2);
  });

  it('returns 0 when event_search was called and found no candidates', () => {
    const withEventSearch: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: TOOL_ID_EVENT_SEARCH,
        tool_call_id: 'event-search-1',
        params: { state: 'active', stream_names: ['logs'] },
        results: [{ type: 'other', data: { events: [], total: 0 } }],
      },
    ];
    expect(extractEventSearchCandidateCount(withEventSearch)).toBe(0);
  });
});
