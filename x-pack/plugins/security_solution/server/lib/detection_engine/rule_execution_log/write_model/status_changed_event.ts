/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IEcsEvent,
  EcsEventBuilder,
  RuleExecutionEventLevel,
  RuleExecutionStatus,
} from '../common_model';

import { AnyRuleExecutionEvent, RuleExecutionEvent } from './rule_execution_event';
import { maxOf, minOf, sumOf, toNano } from './utils';

// -----------------------------------------------------------------------------
// Interface of the event

export type StatusChangedEvent = RuleExecutionEvent<'status-changed', StatusPayload>;

export interface StatusPayload {
  status: RuleExecutionStatus;

  // Additional optional payload
  executionGap?: number; // in milliseconds
  searchDurations?: number[]; // in milliseconds
  indexingDurations?: number[]; // in milliseconds
  lastLookBackDate?: string; // TODO: do we need it? not shown in the UI (commented out)
}

export const StatusChangedEvent = {
  toEcsEvents: (event: StatusChangedEvent): IEcsEvent[] => {
    const ecsEvents = mapStatusChangedEventToEcsEvents(event);

    // TODO: move to a service implementing the rule execution log
    // All generated ecsEvents have the same @timestamp, so we need an additional field for deterministic ordering.
    // https://www.elastic.co/guide/en/ecs/1.8/ecs-event.html#field-event-sequence
    let seq = 0;
    ecsEvents.forEach((e) => {
      e.event = e.event ?? {};
      e.event.sequence = seq++;
    });

    return ecsEvents;
  },
};

// -----------------------------------------------------------------------------
// Mapping of the event to ECS events

const mapStatusChangedEventToEcsEvents = (event: StatusChangedEvent): IEcsEvent[] => {
  return [
    ...ecsExecutionGapMetric(event),
    ...ecsSearchDurationMetrics(event),
    ...ecsIndexingDurationMetrics(event),
    ...ecsIndexingLookbackMetric(event),
    ecsStatusChangedEvent(event),
  ];
};

/**
 * Execution gap metric.
 * -> event.action='metric-execution-gap', event.kind='metric', event.duration=executionGap
 */
const ecsExecutionGapMetric = (event: StatusChangedEvent): IEcsEvent[] => {
  const { executionGap } = event.eventPayload;
  const result = [];

  if (executionGap !== undefined) {
    result.push(
      ecsMetric(event, 'metric-execution-gap')
        .event({ duration: toNano(executionGap) })
        .build()
    );
  }

  return result;
};

/**
 * Search duration metrics.
 * -> event.action='metric-search-duration-min', event.kind='metric', event.duration=MIN(searchDurations)
 * -> event.action='metric-search-duration-max', event.kind='metric', event.duration=MAX(searchDurations)
 * -> event.action='metric-search-duration-sum', event.kind='metric', event.duration=SUM(searchDurations)
 */
const ecsSearchDurationMetrics = (event: StatusChangedEvent): IEcsEvent[] => {
  const { searchDurations } = event.eventPayload;
  const result = [];

  if (searchDurations && searchDurations.length > 0) {
    const min = toNano(minOf(searchDurations));
    const max = toNano(maxOf(searchDurations));
    const sum = toNano(sumOf(searchDurations));

    result.push(
      ecsMetric(event, 'metric-search-duration-min').event({ duration: min }).build(),
      ecsMetric(event, 'metric-search-duration-max').event({ duration: max }).build(),
      ecsMetric(event, 'metric-search-duration-sum').event({ duration: sum }).build()
    );
  }

  return result;
};

/**
 * Indexing duration metrics.
 * -> event.action='metric-indexing-duration-min', event.kind='metric', event.duration=MIN(indexingDurations)
 * -> event.action='metric-indexing-duration-max', event.kind='metric', event.duration=MAX(indexingDurations)
 * -> event.action='metric-indexing-duration-sum', event.kind='metric', event.duration=SUM(indexingDurations)
 */
const ecsIndexingDurationMetrics = (event: StatusChangedEvent): IEcsEvent[] => {
  const { indexingDurations } = event.eventPayload;
  const result = [];

  if (indexingDurations && indexingDurations.length > 0) {
    const min = toNano(minOf(indexingDurations));
    const max = toNano(maxOf(indexingDurations));
    const sum = toNano(sumOf(indexingDurations));

    result.push(
      ecsMetric(event, 'metric-indexing-duration-min').event({ duration: min }).build(),
      ecsMetric(event, 'metric-indexing-duration-max').event({ duration: max }).build(),
      ecsMetric(event, 'metric-indexing-duration-sum').event({ duration: sum }).build()
    );
  }

  return result;
};

/**
 * Indexing lookback metric.
 * -> event.action='metric-indexing-lookback', event.kind='metric', event.end=lastLookBackDate
 */
const ecsIndexingLookbackMetric = (event: StatusChangedEvent): IEcsEvent[] => {
  const { lastLookBackDate } = event.eventPayload;
  const result = [];

  if (lastLookBackDate) {
    result.push(
      ecsMetric(event, 'metric-indexing-lookback').event({ end: lastLookBackDate }).build()
    );
  }

  return result;
};

/**
 * Status changed event.
 * -> event.action='status-changed', event.kind='event', kibana.detection_engine.{rule_status, rule_status_severity}
 */
const ecsStatusChangedEvent = (event: StatusChangedEvent): IEcsEvent => {
  const { eventType, eventPayload } = event;
  const { status } = eventPayload;

  return ecsEvent(event).typeChange(eventType).ruleStatus(status).build();
};

const ecsEvent = (event: AnyRuleExecutionEvent): EcsEventBuilder => {
  const { ruleId, spaceId, eventDate, eventLevel, eventMessage } = event;

  return new EcsEventBuilder()
    .baseFields(eventDate, eventMessage)
    .level(eventLevel)
    .rule(ruleId, spaceId);
};

const ecsMetric = (event: AnyRuleExecutionEvent, eventAction: string): EcsEventBuilder => {
  return ecsEvent(event).typeMetric(eventAction).level(RuleExecutionEventLevel.INFO);
};
