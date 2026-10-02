/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformCoreTools, platformSignificantEventsTools } from '@kbn/agent-builder-common';
import {
  extractOrderedToolCalls,
  extractToolCallIds,
  isToolId,
  summarizePersistenceCalls,
} from '../../utils/tool_usage';
import type { DiscoveryEvaluator } from '../../types';
import type {
  ContinuationCycle,
  ContinuationEvaluator,
} from '../continuation/continuation_stability';

const { executeEsql: TOOL_ID_EXECUTE_ESQL } = platformCoreTools;
const {
  searchKnowledgeIndicators: TOOL_ID_KI_SEARCH,
  searchEvent: TOOL_ID_EVENT_SEARCH,
  eventsWrite: TOOL_ID_EVENTS_WRITE,
} = platformSignificantEventsTools;

export interface ToolUsageScore {
  score: number;
  label: string;
  explanation: string;
}

const isTool = isToolId;

const calledCanonical = (calledTools: Set<string>, canonical: string): boolean =>
  [...calledTools].some((toolId) => isTool(toolId, canonical));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasSchemaValidationFailure = ({
  results,
}: ReturnType<typeof extractOrderedToolCalls>[number]): boolean =>
  results.some(
    (result) =>
      isRecord(result) &&
      isRecord(result.data) &&
      typeof result.data.message === 'string' &&
      result.data.message.includes('Received tool input did not match expected schema')
  );

const hasCompletedItems = ({
  params,
}: ReturnType<typeof extractOrderedToolCalls>[number]): boolean =>
  Array.isArray(params.items) && params.items.length > 0;

const isSerializationRecovery = (
  eventWrites: Array<ReturnType<typeof extractOrderedToolCalls>[number]>
): boolean => {
  const [failedWrite, recoveredWrite] = eventWrites;
  return (
    eventWrites.length === 2 &&
    failedWrite !== undefined &&
    !hasCompletedItems(failedWrite) &&
    recoveredWrite !== undefined &&
    hasCompletedItems(recoveredWrite) &&
    !hasSchemaValidationFailure(recoveredWrite)
  );
};

const findDuplicateEventWriteRule = (
  eventWrites: Array<ReturnType<typeof extractOrderedToolCalls>[number]>
): { ruleUuid: string; firstItemIndex: number; secondItemIndex: number } | undefined => {
  const ruleOwners = new Map<string, number>();

  for (const { params } of eventWrites) {
    if (!Array.isArray(params.items)) {
      continue;
    }
    for (const [itemIndex, item] of params.items.entries()) {
      if (!isRecord(item) || !Array.isArray(item.signals)) {
        continue;
      }
      for (const signal of item.signals) {
        if (!isRecord(signal) || !isRecord(signal.metadata)) {
          continue;
        }
        const ruleUuid = signal.metadata.rule_uuid;
        if (typeof ruleUuid !== 'string') {
          continue;
        }
        const firstItemIndex = ruleOwners.get(ruleUuid);
        if (firstItemIndex !== undefined) {
          return { ruleUuid, firstItemIndex, secondItemIndex: itemIndex };
        }
        ruleOwners.set(ruleUuid, itemIndex);
      }
    }
  }
};

/** Require events_write and reject workflow-owned discovery stamping. */
const scoreOutputTool = (
  calledTools: Set<string>,
  steps: ConverseStep[]
): ToolUsageScore | null => {
  if (!calledCanonical(calledTools, TOOL_ID_EVENTS_WRITE)) {
    return {
      score: 0,
      label: `missing-${TOOL_ID_EVENTS_WRITE}`,
      explanation: `${TOOL_ID_EVENTS_WRITE} was not called — required to persist the decision`,
    };
  }

  const eventWrites = extractOrderedToolCalls(steps).filter(({ toolId }) =>
    isTool(toolId, TOOL_ID_EVENTS_WRITE)
  );
  const duplicateRule = findDuplicateEventWriteRule(eventWrites);
  if (duplicateRule) {
    return {
      score: 0,
      label: 'duplicate-rule-across-items',
      explanation: `${TOOL_ID_EVENTS_WRITE} assigns rule UUID ${duplicateRule.ruleUuid} to items ${duplicateRule.firstItemIndex} and ${duplicateRule.secondItemIndex}; merge those components before writing`,
    };
  }
  const schemaFailureIndex = eventWrites.findIndex(hasSchemaValidationFailure);
  if (schemaFailureIndex !== -1) {
    if (schemaFailureIndex === 0 && isSerializationRecovery(eventWrites)) {
      return null;
    }

    const retriedAfterSchemaFailure = eventWrites.length > schemaFailureIndex + 1;
    return {
      score: 0,
      label: retriedAfterSchemaFailure
        ? 'events-write-schema-validation-retry'
        : 'events-write-schema-validation-failure',
      explanation: retriedAfterSchemaFailure
        ? `${TOOL_ID_EVENTS_WRITE} retried after a schema-validation failure instead of correcting ownership before its single write`
        : `${TOOL_ID_EVENTS_WRITE} rejected the completed payload during schema validation`,
    };
  }

  const invalidWrite = eventWrites.some(
    ({ params, toolId }) =>
      isTool(toolId, TOOL_ID_EVENTS_WRITE) &&
      (!Array.isArray(params.items) || params.items.length === 0)
  );
  if (invalidWrite) {
    return {
      score: 0,
      label: 'invalid-events-write-payload',
      explanation: `${TOOL_ID_EVENTS_WRITE} requires a non-empty items array`,
    };
  }

  const persistenceCalls = summarizePersistenceCalls(steps, TOOL_ID_EVENTS_WRITE);
  if (!persistenceCalls.valid) {
    return {
      score: 0.75,
      label: `multiple-${TOOL_ID_EVENTS_WRITE}-calls`,
      explanation: `${TOOL_ID_EVENTS_WRITE} was called ${persistenceCalls.count} times without one justified partial-failure retry`,
    };
  }
  return null;
};

const didRuleSearchReturnNoCandidates = ({
  params,
  results,
  toolId,
}: ReturnType<typeof extractOrderedToolCalls>[number]): boolean =>
  isTool(toolId, TOOL_ID_EVENT_SEARCH) &&
  Array.isArray(params.rule_uuids) &&
  params.rule_uuids.length > 0 &&
  results.some(
    (result) =>
      isRecord(result) &&
      isRecord(result.data) &&
      (result.data.total === 0 ||
        (Array.isArray(result.data.events) && result.data.events.length === 0))
  );

const writesTopology = ({ params, toolId }: ReturnType<typeof extractOrderedToolCalls>[number]) =>
  isTool(toolId, TOOL_ID_EVENTS_WRITE) &&
  Array.isArray(params.items) &&
  params.items.some(
    (item) =>
      isRecord(item) &&
      ((Array.isArray(item.causal_features) && item.causal_features.length > 0) ||
        (Array.isArray(item.blast_radius) && item.blast_radius.length > 0))
  );

export const scoreToolUsage = ({
  steps,
  detectionCount,
  allowNewEventTopologyWrite = false,
}: {
  steps: ConverseStep[];
  detectionCount: number;
  /** When true, skip the topology-search requirement after a zero-result rule search (new episode). */
  allowNewEventTopologyWrite?: boolean;
}): ToolUsageScore => {
  const calledTools = new Set(extractToolCallIds(steps));

  if (detectionCount === 0) {
    return calledTools.size === 0
      ? { score: 1, label: 'correct', explanation: 'Empty batch: no tool calls made as expected' }
      : {
          score: 0,
          label: 'unexpected-tools',
          explanation: `Empty batch: agent made ${calledTools.size} unexpected tool call(s) instead of early-exiting`,
        };
  }

  const orderedCalls = extractOrderedToolCalls(steps);

  const outputCheck = scoreOutputTool(calledTools, steps);
  if (outputCheck) {
    return outputCheck;
  }

  const hasQueryKiSearch = orderedCalls.some(
    ({ toolId, params }) =>
      isTool(toolId, TOOL_ID_KI_SEARCH) &&
      Array.isArray(params.kind) &&
      params.kind.includes('query')
  );
  if (!hasQueryKiSearch) {
    return {
      score: 0,
      label: `missing-${TOOL_ID_KI_SEARCH}`,
      explanation: `${TOOL_ID_KI_SEARCH} was not called`,
    };
  }

  const ruleSearchFoundNoCandidates = orderedCalls.some(didRuleSearchReturnNoCandidates);
  const hasTopologySearch = orderedCalls.some(
    ({ params, toolId }) =>
      isTool(toolId, TOOL_ID_EVENT_SEARCH) &&
      Array.isArray(params.topology_feature_ids) &&
      params.topology_feature_ids.length > 0
  );
  if (
    !(allowNewEventTopologyWrite && !ruleSearchFoundNoCandidates) &&
    ruleSearchFoundNoCandidates &&
    orderedCalls.some(writesTopology) &&
    !hasTopologySearch
  ) {
    return {
      score: 0,
      label: 'missing-topology-search',
      explanation:
        'A rule-filtered event search returned no candidates, but the agent wrote topology-bearing event data without running the required topology-filtered event search',
    };
  }

  const expected = [TOOL_ID_EXECUTE_ESQL, TOOL_ID_KI_SEARCH, TOOL_ID_EVENT_SEARCH];
  const missing = expected.filter((t) => !calledCanonical(calledTools, t));
  const score = (expected.length - missing.length) / expected.length;
  const persistenceCalls = summarizePersistenceCalls(steps, TOOL_ID_EVENTS_WRITE);
  return {
    score,
    label: missing.length === 0 ? 'correct' : `missing-${missing.join('-')}`,
    explanation:
      score === 1
        ? persistenceCalls.retriedPartialFailure
          ? 'Correctly called all tools and retried only failed event items'
          : persistenceCalls.retriedSchemaFailure
            ? 'Correctly called all tools and retried after a schema or tool error'
            : 'Correctly called all tools'
        : `Missing tools: ${missing.join(', ')}`,
  };
};

export const createDiscoveryToolUsageEvaluator = (): DiscoveryEvaluator => ({
  name: 'trajectory',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ input, output }) => {
    const detections = output.inputDetections ?? input.detections ?? [];
    return Promise.resolve(
      scoreToolUsage({
        steps: output.steps ?? [],
        detectionCount: detections.length,
      })
    );
  },
});

export const scoreToolUsageContinuation = (cycles: ContinuationCycle[]): ToolUsageScore => {
  if (cycles.length === 0) {
    return { score: 0, label: 'no-cycles', explanation: 'No cycles to score' };
  }

  const perCycle = cycles.map((cycle, cycleIndex): ToolUsageScore => {
    const steps = cycle.steps ?? [];
    const baseScore = scoreToolUsage({
      steps,
      detectionCount: 1,
      // Establishing cycle of a new episode may write topology without a topology search.
      // A new event after a closed seed (`expectReuse: false`) still requires that search.
      allowNewEventTopologyWrite: cycleIndex === 0 && cycle.expectReuse !== false,
    });
    if (
      cycleIndex > 0 &&
      cycle.expectTopologyEventSearch &&
      !extractOrderedToolCalls(steps).some(
        ({ toolId, params }) =>
          isTool(toolId, TOOL_ID_EVENT_SEARCH) &&
          Array.isArray(params.topology_feature_ids) &&
          params.topology_feature_ids.length > 0
      )
    ) {
      return {
        score: 0,
        label: 'missing-topology-search',
        explanation: `${TOOL_ID_EVENT_SEARCH} was not called with topology_feature_ids: […] — required to filter events by topology`,
      };
    }
    return baseScore;
  });

  const score = perCycle.reduce((sum, r) => sum + r.score, 0) / perCycle.length;
  return {
    score,
    label: score === 1 ? 'correct' : 'partial',
    explanation: perCycle.map((r, i) => `cycle ${i + 1}: ${r.label} (${r.score})`).join('; '),
  };
};

/** CODE evaluator: mean per-cycle tool-usage score for the continuation test. */
export const continuationTrajectoryEvaluator: ContinuationEvaluator = {
  name: 'trajectory',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ output }) => Promise.resolve(scoreToolUsageContinuation(output.cycles ?? [])),
};
