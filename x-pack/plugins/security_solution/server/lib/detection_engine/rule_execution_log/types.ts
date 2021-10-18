/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration } from 'moment';
import { SavedObjectsFindResult } from '../../../../../../../src/core/server';
import { RuleExecutionStatus } from '../../../../common/detection_engine/schemas/common/schemas';
import { IRuleStatusSOAttributes } from '../rules/types';

export enum UnderlyingLogClient {
  'savedObjects' = 'savedObjects',
  'eventLog' = 'eventLog',
}

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

export interface ExecutionMetrics {
  searchDurations?: string[];
  indexingDurations?: string[];
  /**
   * @deprecated lastLookBackDate is logged only by SavedObjectsAdapter and should be removed in the future
   */
  lastLookBackDate?: string;
  executionGap?: Duration;
}

export interface LogStatusChangeArgs {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  spaceId: string;
  newStatus: RuleExecutionStatus;
  message?: string;
  /**
   * @deprecated Use RuleExecutionLogClient.logExecutionMetrics to write metrics instead
   */
  metrics?: ExecutionMetrics;
}

export interface UpdateExecutionLogArgs {
  id: string;
  attributes: IRuleStatusSOAttributes;
  ruleId: string;
  ruleName: string;
  ruleType: string;
  spaceId: string;
}

export interface CreateExecutionLogArgs {
  attributes: IRuleStatusSOAttributes;
  spaceId: string;
}

export interface LogExecutionMetricsArgs {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  spaceId: string;
  metrics: ExecutionMetrics;
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
  logExecutionMetrics: (args: LogExecutionMetricsArgs) => Promise<void>;
}
