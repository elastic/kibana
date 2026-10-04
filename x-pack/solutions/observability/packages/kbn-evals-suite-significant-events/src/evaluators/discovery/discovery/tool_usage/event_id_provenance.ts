/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformSignificantEventsTools } from '@kbn/agent-builder-common';
import type { DiscoveryEvaluator } from '../../types';
import {
  extractOrderedToolCalls,
  isRecord,
  isToolId,
  openEventIdsBefore,
} from '../../utils/tool_usage';
import type {
  ContinuationCycle,
  ContinuationEvaluator,
} from '../continuation/continuation_stability';

interface EventIdProvenanceObservation {
  eventId: string;
  callIndex: number;
  itemIndex: number;
  valid: boolean;
  cycleIndex?: number;
}

export interface EventIdProvenanceScore {
  score: number | null;
  idBearingItems: number;
  validItems: number;
  explanation: string;
}

const collectEventIdProvenance = (
  steps: ConverseStep[],
  cycleIndex?: number
): EventIdProvenanceObservation[] => {
  const calls = extractOrderedToolCalls(steps);
  const observations: EventIdProvenanceObservation[] = [];

  for (const call of calls) {
    if (
      !isToolId(call.toolId, platformSignificantEventsTools.eventsWrite) ||
      !Array.isArray(call.params.items)
    ) {
      continue;
    }

    const availableOpenEventIds = openEventIdsBefore(calls, call);
    for (const [itemIndex, item] of call.params.items.entries()) {
      if (!isRecord(item) || typeof item.event_id !== 'string' || item.event_id.length === 0) {
        continue;
      }
      observations.push({
        eventId: item.event_id,
        callIndex: call.index,
        itemIndex,
        valid: availableOpenEventIds.has(item.event_id),
        cycleIndex,
      });
    }
  }

  return observations;
};

const formatObservation = ({
  eventId,
  callIndex,
  itemIndex,
  cycleIndex,
}: EventIdProvenanceObservation): string => {
  const cycle = cycleIndex === undefined ? '' : `cycle ${cycleIndex + 1}, `;
  return `${cycle}step ${callIndex + 1}, item ${itemIndex}: ${JSON.stringify(eventId)}`;
};

const scoreObservations = (
  observations: EventIdProvenanceObservation[]
): EventIdProvenanceScore => {
  if (observations.length === 0) {
    return {
      score: null,
      idBearingItems: 0,
      validItems: 0,
      explanation: 'No events_write items carried an event_id',
    };
  }

  const offenders = observations.filter(({ valid }) => !valid);
  const validItems = observations.length - offenders.length;
  return {
    score: validItems / observations.length,
    idBearingItems: observations.length,
    validItems,
    explanation:
      offenders.length === 0
        ? `All ${observations.length} event_id-bearing item(s) used an open event_id from an earlier event_search call group`
        : `${validItems}/${
            observations.length
          } event_id-bearing item(s) used an open event_id from an earlier event_search call group. Offenders: ${offenders
            .map(formatObservation)
            .join('; ')}`,
  };
};

/** Scores event_id provenance within one agent run. */
export const scoreEventIdProvenance = (steps: ConverseStep[]): EventIdProvenanceScore =>
  scoreObservations(collectEventIdProvenance(steps));

/** Scores event_id provenance across continuation cycles, resetting available IDs each cycle. */
export const scoreContinuationEventIdProvenance = (
  cycles: ContinuationCycle[]
): EventIdProvenanceScore =>
  scoreObservations(
    cycles.flatMap((cycle, cycleIndex) => collectEventIdProvenance(cycle.steps ?? [], cycleIndex))
  );

export const eventIdProvenanceEvaluator: DiscoveryEvaluator = {
  name: 'event_id_provenance',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ output }) => Promise.resolve(scoreEventIdProvenance(output.steps ?? [])),
};

export const continuationEventIdProvenanceEvaluator: ContinuationEvaluator = {
  name: 'event_id_provenance',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: ({ output }) =>
    Promise.resolve(scoreContinuationEventIdProvenance(output.cycles ?? [])),
};
