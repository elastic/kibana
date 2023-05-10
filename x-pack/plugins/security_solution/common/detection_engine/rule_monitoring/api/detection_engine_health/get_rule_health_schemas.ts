/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';
import type { RuleLastRunOutcomes } from '@kbn/alerting-plugin/common';
import type { HealthInterval } from '../../model/detection_engine_health/health_interval';
import { HealthIntervalParameters } from '../../model/detection_engine_health/health_interval';
import type { RuleExecutionStatus } from '../../model/execution_status';
import type { RuleExecutionMetrics } from '../../model/execution_metrics';
import type { RuleName, RuleResponse, RuleSignatureId } from '../../../rule_schema';
import { RuleObjectId } from '../../../rule_schema';
import type { HealthResponseMetadata } from '../../model/detection_engine_health/health_response_metadata';

export type GetRuleHealthRequestBody = t.TypeOf<typeof GetRuleHealthRequestBody>;
export const GetRuleHealthRequestBody = t.exact(
  t.intersection([
    t.type({
      rule_id: RuleObjectId,
    }),
    t.partial({
      interval: HealthIntervalParameters,
      verbose: t.boolean,
    }),
  ])
);

export interface GetRuleHealthRequest {
  ruleId: RuleObjectId;
  interval: HealthInterval;
  verbose: boolean;
  requestReceivedAt: IsoDateString;
}

export interface GetRuleHealthResponse {
  meta: HealthResponseMetadata;
  rule: RuleSummary | RuleResponse;
  last_execution: RuleHealthLastExecution;
  execution_stats: RuleHealthExecutionStats;
  execution_history: RuleHealthExecutionHistory;
}

export interface RuleSummary {
  id: RuleObjectId;
  rule_id: RuleSignatureId;
  name: RuleName;
  type: string;
}

export interface RuleHealthLastExecution {
  timestamp: IsoDateString;
  status: RuleExecutionStatus;
  message: string;
  metrics: RuleExecutionMetrics;
}

export interface RuleHealthExecutionStats {
  number_of_executions: NumberOfRuleExecutions;
  most_frequent_outcomes: NumberOfRuleExecutionOutcomes[];
  most_frequent_errors: NumberOfLoggedMessages[];
  most_frequent_warnings: NumberOfLoggedMessages[];
  detected_gaps: NumberOfDetectedGaps;
  aggregated_metrics: AggregatedRuleExecutionMetrics;
}

export interface NumberOfRuleExecutions {
  total: number;
  succeeded: number;
  warning: number;
  failed: number;
}

export interface NumberOfRuleExecutionOutcomes {
  count: number;
  outcome: RuleLastRunOutcomes;
  message: string;
}

export interface NumberOfLoggedMessages {
  count: number;
  level: LogLevel;
  message: string;
}

export interface NumberOfDetectedGaps {
  count: number;
  total_duration_s: number;
}

export interface AggregatedRuleExecutionMetrics {
  scheduling_delay_ms: Percentiles<number>;
  execution_duration_ms: Percentiles<number>;
  search_duration_ms: Percentiles<number>;
  indexing_duration_ms: Percentiles<number>;
}

export interface Percentiles<T> {
  min: T;
  p50: T;
  p95: T;
  p99: T;
  max: T;
}

export interface RuleHealthExecutionHistory {
  foo: 'bar';
}
