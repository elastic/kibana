/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleHealthOverviewStats,
  LogLevel,
  NumberOfDetectedGaps,
  NumberOfExecutions,
  NumberOfLoggedMessages,
  RuleExecutionStatus,
  TopMessages,
} from '../../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  LogLevelEnum,
  RuleExecutionStatusEnum,
} from '../../../../../../../../common/api/detection_engine/rule_monitoring';
import type { RawData } from '../../../utils/normalization';
import type { RuleExecutionStatsAggregationLevel } from '../aggregation_level';
import { normalizeAggregatedMetric } from './normalize_aggregated_metric';

export const normalizeRuleExecutionStatsAggregationResult = (
  aggregations: Record<string, RawData>,
  aggregationLevel: RuleExecutionStatsAggregationLevel
): RuleHealthOverviewStats => {
  const executeEvents = aggregations.executeEvents || {};
  const statusChangeEvents = aggregations.statusChangeEvents || {};
  const executionMetricsEvents = aggregations.executionMetricsEvents || {};
  const messageContainingEvents = aggregations.messageContainingEvents || {};

  const totalExecutions = executeEvents.totalExecutions || {};
  const executionDurationMs = executeEvents.executionDurationMs || {};
  const scheduleDelayNs = executeEvents.scheduleDelayNs || {};
  const executionsByStatus = statusChangeEvents.executionsByStatus || {};
  const gaps = executionMetricsEvents.gaps || {};
  const searchDurationMs = executionMetricsEvents.searchDurationMs || {};
  const indexingDurationMs = executionMetricsEvents.indexingDurationMs || {};

  return {
    number_of_executions: normalizeNumberOfExecutions(totalExecutions, executionsByStatus),
    number_of_logged_messages: normalizeNumberOfLoggedMessages(messageContainingEvents),
    number_of_detected_gaps: normalizeNumberOfDetectedGaps(gaps),
    schedule_delay_ms: normalizeAggregatedMetric(scheduleDelayNs, (val) => val / 1_000_000),
    execution_duration_ms: normalizeAggregatedMetric(executionDurationMs),
    search_duration_ms: normalizeAggregatedMetric(searchDurationMs),
    indexing_duration_ms: normalizeAggregatedMetric(indexingDurationMs),
    top_errors:
      aggregationLevel === 'whole-interval'
        ? normalizeTopErrors(messageContainingEvents)
        : undefined,
    top_warnings:
      aggregationLevel === 'whole-interval'
        ? normalizeTopWarnings(messageContainingEvents)
        : undefined,
  };
};

const normalizeNumberOfExecutions = (
  totalExecutions: RawData,
  executionsByStatus: RawData
): NumberOfExecutions => {
  const getStatusCount = (status: RuleExecutionStatus): number => {
    const bucket = executionsByStatus.buckets.find((b: RawData) => b.key === status);
    return Number(bucket?.doc_count || 0);
  };

  return {
    total: Number(totalExecutions.value || 0),
    by_outcome: {
      succeeded: getStatusCount(RuleExecutionStatusEnum.succeeded),
      warning: getStatusCount(RuleExecutionStatusEnum['partial failure']),
      failed: getStatusCount(RuleExecutionStatusEnum.failed),
    },
  };
};

const normalizeNumberOfLoggedMessages = (
  messageContainingEvents: RawData
): NumberOfLoggedMessages => {
  const messagesByLogLevel = messageContainingEvents.messagesByLogLevel || {};

  const getMessageCount = (level: LogLevel): number => {
    const bucket = messagesByLogLevel.buckets.find((b: RawData) => b.key === level);
    return Number(bucket?.doc_count || 0);
  };

  return {
    total: Number(messageContainingEvents.doc_count || 0),
    by_level: {
      error: getMessageCount(LogLevelEnum.error),
      warn: getMessageCount(LogLevelEnum.warn),
      info: getMessageCount(LogLevelEnum.info),
      debug: getMessageCount(LogLevelEnum.debug),
      trace: getMessageCount(LogLevelEnum.trace),
    },
  };
};

const normalizeNumberOfDetectedGaps = (gaps: RawData): NumberOfDetectedGaps => {
  return {
    total: Number(gaps.doc_count || 0),
    total_duration_s: Number(gaps.totalGapDurationS?.value || 0),
  };
};

const normalizeTopErrors = (messageContainingEvents: RawData): TopMessages => {
  const topErrors = messageContainingEvents.errors?.topErrors || {};
  return normalizeTopMessages(topErrors);
};

const normalizeTopWarnings = (messageContainingEvents: RawData): TopMessages => {
  const topWarnings = messageContainingEvents.warnings?.topWarnings || {};
  return normalizeTopMessages(topWarnings);
};

const normalizeTopMessages = (categorizeTextAggregate: RawData): TopMessages => {
  const buckets = (categorizeTextAggregate || {}).buckets || [];
  return buckets.map((b: RawData) => {
    return {
      count: Number(b?.doc_count || 0),
      message: String(b?.key || ''),
    };
  });
};
