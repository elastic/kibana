/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { SavedObjectsFindResult } from '../../../../../../../src/core/server';
import { RuleDataPluginService } from '../../../../../rule_registry/server';
import { RuleExecutionStatus } from '../../../../common/detection_engine/schemas/common/schemas';
import { IRuleStatusSOAttributes } from '../rules/types';

export enum ExecutionMetric {
  'executionGap' = 'executionGap',
  'searchDurationMax' = 'searchDurationMax',
  'indexingDurationMax' = 'indexingDurationMax',
  'indexingLookback' = 'indexingLookback',
}

export type IRuleDataPluginService = PublicMethodsOf<RuleDataPluginService>;

export type ExecutionMetricValue<T extends ExecutionMetric> = {
  [ExecutionMetric.executionGap]: number;
  [ExecutionMetric.searchDurationMax]: number;
  [ExecutionMetric.indexingDurationMax]: number;
  [ExecutionMetric.indexingLookback]: Date;
}[T];

export interface FindExecutionLogArgs {
  ruleId: string;
  spaceId: string;
  logsCount?: number;
}

export interface FindBulkExecutionLogArgs {
  ruleIds: string[];
  spaceId: string;
  logsCount?: number;
}

/**
 * @deprecated LegacyMetrics are only kept here for backward compatibility
 * and should be replaced by ExecutionMetric in the future
 */
export interface LegacyMetrics {
  searchAfterTimeDurations?: string[];
  bulkCreateTimeDurations?: string[];
  lastLookBackDate?: string;
  gap?: string;
}

export interface LogStatusChangeArgs {
  ruleId: string;
  spaceId: string;
  newStatus: RuleExecutionStatus;
  namespace?: string;
  message?: string;
  metrics?: LegacyMetrics;
}

export interface UpdateExecutionLogArgs {
  id: string;
  attributes: IRuleStatusSOAttributes;
  spaceId: string;
}

export interface CreateExecutionLogArgs {
  attributes: IRuleStatusSOAttributes;
  spaceId: string;
}

export interface ExecutionMetricArgs<T extends ExecutionMetric> {
  ruleId: string;
  spaceId: string;
  namespace?: string;
  metric: T;
  value: ExecutionMetricValue<T>;
}

export interface FindBulkExecutionLogResponse {
  [ruleId: string]: IRuleStatusSOAttributes[] | undefined;
}

export interface IRuleExecutionLogClient {
  find: (
    args: FindExecutionLogArgs
  ) => Promise<Array<SavedObjectsFindResult<IRuleStatusSOAttributes>>>;
  findBulk: (args: FindBulkExecutionLogArgs) => Promise<FindBulkExecutionLogResponse>;
  update: (args: UpdateExecutionLogArgs) => Promise<void>;
  delete: (id: string) => Promise<void>;
  logStatusChange: (args: LogStatusChangeArgs) => Promise<void>;
  logExecutionMetric: <T extends ExecutionMetric>(args: ExecutionMetricArgs<T>) => Promise<void>;
}
