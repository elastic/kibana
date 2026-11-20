/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import { stableStringify } from '@kbn/std';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export interface OrderedToolCall {
  index: number;
  toolId: string;
  params: Record<string, unknown>;
  groupId?: string;
  results: unknown[];
}

/** Tool calls with their original ordering and Agent Builder parallel-call group. */
export function extractOrderedToolCalls(steps: ConverseStep[]): OrderedToolCall[] {
  return steps.flatMap((step, index) => {
    if (step.type !== 'tool_call' || typeof step.tool_id !== 'string') {
      return [];
    }
    return [
      {
        index,
        toolId: step.tool_id,
        params: isRecord(step.params) ? step.params : {},
        groupId: typeof step.tool_call_group_id === 'string' ? step.tool_call_group_id : undefined,
        results: Array.isArray(step.results) ? step.results : [],
      },
    ];
  });
}

/** Tool ids of every `tool_call` step, in call order. Feeds the trajectory (coverage) evaluator. */
export function extractToolCallIds(steps: ConverseStep[]): string[] {
  return extractOrderedToolCalls(steps).map(({ toolId }) => toolId);
}

/** Total number of `tool_call` steps (the agent's tool-call budget usage). */
export function getToolCallCount(steps: ConverseStep[]): number {
  return steps.filter((step) => step.type === 'tool_call').length;
}

/** Agent Builder live traces use underscores; eval fixtures use dotted ids. */
export function isToolId(toolId: string, canonical: string): boolean {
  return toolId.replace(/\./g, '_') === canonical.replace(/\./g, '_');
}

const isEarlierCallGroup = (candidate: OrderedToolCall, call: OrderedToolCall): boolean =>
  candidate.index < call.index &&
  (candidate.groupId === undefined ||
    call.groupId === undefined ||
    candidate.groupId !== call.groupId);

/** Active event IDs returned by event_search call groups completed before the target call group. */
export function activeEventIdsBefore(calls: OrderedToolCall[], call: OrderedToolCall): Set<string> {
  const eventIds = new Set<string>();
  for (const candidate of calls) {
    if (
      !isEarlierCallGroup(candidate, call) ||
      !isToolId(candidate.toolId, platformSignificantEventsTools.searchEvent)
    ) {
      continue;
    }
    for (const result of candidate.results) {
      if (!isRecord(result) || !isRecord(result.data) || !Array.isArray(result.data.events)) {
        continue;
      }
      for (const event of result.data.events) {
        if (
          isRecord(event) &&
          event.status === 'active' &&
          typeof event.event_id === 'string' &&
          event.event_id.length > 0
        ) {
          eventIds.add(event.event_id);
        }
      }
    }
  }
  return eventIds;
}

const isSchemaOrToolError = (step: ConverseStep): boolean => {
  if (step.type !== 'tool_call' || !Array.isArray(step.results)) {
    return false;
  }
  return step.results.some(
    (result) =>
      isRecord(result) &&
      (result.type === 'error' ||
        (isRecord(result.data) &&
          typeof result.data.message === 'string' &&
          /schema|items/i.test(result.data.message)))
  );
};

export const RETRYABLE_ITEM_REASONS = ['bulk_error'] as const;

type RetryableItemReason = (typeof RETRYABLE_ITEM_REASONS)[number];

export interface RetryableFailure {
  item: Record<string, unknown>;
  reason: RetryableItemReason;
}

export interface RetryItemPair {
  failure: RetryableFailure;
  retryItem: Record<string, unknown>;
}

const isRetryableItemReason = (value: unknown): value is RetryableItemReason =>
  RETRYABLE_ITEM_REASONS.some((reason) => reason === value);

const retryPairingKey = (item: Record<string, unknown>): string => {
  const content = { ...item };
  delete content.event_id;
  return stableStringify(content);
};

const getRetryableFailures = (call: OrderedToolCall): RetryableFailure[] | null => {
  if (!Array.isArray(call.params.items)) {
    return null;
  }
  const failures: RetryableFailure[] = [];
  const seenIndexes = new Set<number>();

  for (const result of call.results) {
    if (!isRecord(result) || !isRecord(result.data) || !Array.isArray(result.data.results)) {
      continue;
    }
    for (const itemResult of result.data.results) {
      if (
        !isRecord(itemResult) ||
        itemResult.written !== false ||
        !isRetryableItemReason(itemResult.reason)
      ) {
        continue;
      }
      const { index } = itemResult;
      if (typeof index !== 'number' || !Number.isInteger(index)) {
        return null;
      }
      const item = call.params.items[index];
      if (!isRecord(item) || seenIndexes.has(index)) {
        return null;
      }
      seenIndexes.add(index);
      failures.push({ item, reason: itemResult.reason });
    }
  }
  return failures;
};

/**
 * Pairs a retry one-to-one and onto the first call's retryable item failures.
 * Every field in a retryable item must remain unchanged.
 */
export function pairRetryItems({
  firstCall,
  retryCall,
}: {
  firstCall: OrderedToolCall;
  retryCall: OrderedToolCall;
}): RetryItemPair[] | null {
  if (!isEarlierCallGroup(firstCall, retryCall)) {
    return null;
  }

  const failures = getRetryableFailures(firstCall);
  if (
    failures === null ||
    failures.length === 0 ||
    !Array.isArray(retryCall.params.items) ||
    retryCall.params.items.length !== failures.length
  ) {
    return null;
  }

  const retryItems = retryCall.params.items;
  if (!retryItems.every(isRecord)) {
    return null;
  }

  const retriesByKey = new Map<string, Array<Record<string, unknown>>>();
  for (const retryItem of retryItems) {
    const key = retryPairingKey(retryItem);
    const matchingRetries = retriesByKey.get(key) ?? [];
    matchingRetries.push(retryItem);
    retriesByKey.set(key, matchingRetries);
  }

  const failuresByKey = new Map<string, RetryableFailure[]>();
  for (const failure of failures) {
    const key = retryPairingKey(failure.item);
    const matchingFailures = failuresByKey.get(key) ?? [];
    matchingFailures.push(failure);
    failuresByKey.set(key, matchingFailures);
  }

  if (
    retriesByKey.size !== failuresByKey.size ||
    [...failuresByKey].some(
      ([key, matchingFailures]) => retriesByKey.get(key)?.length !== matchingFailures.length
    )
  ) {
    return null;
  }

  const pairs: RetryItemPair[] = [];

  for (const [key, matchingFailures] of failuresByKey) {
    const unmatchedRetries = [...(retriesByKey.get(key) ?? [])];

    for (const failure of matchingFailures) {
      const retryIndex = unmatchedRetries.findIndex(
        (retryItem) => stableStringify(retryItem) === stableStringify(failure.item)
      );
      if (retryIndex === -1) {
        return null;
      }
      const [retryItem] = unmatchedRetries.splice(retryIndex, 1);
      pairs.push({ failure, retryItem });
    }

    if (unmatchedRetries.length > 0) {
      return null;
    }
  }

  return pairs;
}

const getBulkInputCount = (step: ConverseStep): number =>
  step.type === 'tool_call' && isRecord(step.params) && Array.isArray(step.params.items)
    ? step.params.items.length
    : 0;

export interface PersistenceCallSummary {
  count: number;
  valid: boolean;
  /** True only when the retry pairs exactly with every retryable item failure from the first call. */
  retriedPartialFailure: boolean;
  /** True when the first call returned a schema or tool-level error and the retry submitted a populated payload. */
  retriedSchemaFailure: boolean;
}

/** One normal persistence call, or one exact retry after a completed call exposed item failures. */
export function summarizePersistenceCalls(
  steps: ConverseStep[],
  toolId: string
): PersistenceCallSummary {
  const orderedCalls = extractOrderedToolCalls(steps);
  const calls = orderedCalls.filter(({ toolId: calledToolId }) => isToolId(calledToolId, toolId));
  if (calls.length === 1) {
    return { count: 1, valid: true, retriedPartialFailure: false, retriedSchemaFailure: false };
  }
  const retriedPartialFailure =
    calls.length === 2 && pairRetryItems({ firstCall: calls[0], retryCall: calls[1] }) !== null;
  const retriedSchemaFailure =
    calls.length === 2 &&
    isEarlierCallGroup(calls[0], calls[1]) &&
    isSchemaOrToolError(steps[calls[0].index]) &&
    getBulkInputCount(steps[calls[1].index]) > 0;
  const valid = retriedPartialFailure || retriedSchemaFailure;
  return { count: calls.length, valid, retriedPartialFailure, retriedSchemaFailure };
}

/**
 * Number of continuation candidates the (last) `platform_sig_events_event_search` call in
 * `steps` returned, or `null` if the tool was never called. Reads `data.total` when present
 * (the tool's declared response shape), falling back to `data.events.length`.
 */
export function extractEventSearchCandidateCount(steps: ConverseStep[]): number | null {
  let candidateCount: number | null = null;
  for (const step of steps) {
    if (
      step.type !== 'tool_call' ||
      typeof step.tool_id !== 'string' ||
      !isToolId(step.tool_id, platformSignificantEventsTools.searchEvent)
    ) {
      continue;
    }
    const results = Array.isArray(step.results) ? step.results : [];
    for (const result of results) {
      if (!isRecord(result) || !isRecord(result.data)) continue;
      if (typeof result.data.total === 'number') {
        candidateCount = result.data.total;
      } else if (Array.isArray(result.data.events)) {
        candidateCount = result.data.events.length;
      }
    }
  }
  return candidateCount;
}

/** Whether an `execute_esql` call returned at least one row (`data.values` on a results entry). */
function didExecuteEsqlToolReturnRows(results: unknown[]): boolean {
  for (const result of results) {
    if (isRecord(result) && isRecord(result.data) && Array.isArray(result.data.values)) {
      return result.data.values.length > 0;
    }
  }
  return false;
}

export function didToolCallReturnRows(toolCall: OrderedToolCall): boolean {
  return didExecuteEsqlToolReturnRows(toolCall.results);
}

export interface EsqlGroundingSummary {
  /** Number of `execute_esql` tool calls. */
  noOfToolCalls: number;
  /** How many of those returned at least one row. */
  noOfToolCallsWithResults: number;
}

/** `execute_esql` call count and how many returned rows. */
export function summarizeEsqlGrounding(steps: ConverseStep[]): EsqlGroundingSummary {
  let noOfToolCalls = 0;
  let noOfToolCallsWithResults = 0;

  for (const step of steps) {
    if (
      step.type !== 'tool_call' ||
      typeof step.tool_id !== 'string' ||
      !isToolId(step.tool_id, platformCoreTools.executeEsql)
    ) {
      continue;
    }
    noOfToolCalls++;
    const results = Array.isArray(step.results) ? step.results : [];
    if (didExecuteEsqlToolReturnRows(results)) {
      noOfToolCallsWithResults++;
    }
  }

  return { noOfToolCalls, noOfToolCallsWithResults };
}
