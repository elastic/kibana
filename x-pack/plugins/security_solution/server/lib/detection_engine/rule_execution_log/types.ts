/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration } from 'moment';
import { LogMeta, SavedObjectsFindResult } from 'src/core/server';
import { RuleExecutionStatus } from '../../../../common/detection_engine/schemas/common/schemas';
import { IRuleStatusSOAttributes } from '../rules/types';

export enum UnderlyingLogClient {
  'savedObjects' = 'savedObjects',
  'eventLog' = 'eventLog',
}

export interface IRuleExecutionLogClient {
  /** @deprecated */
  find(args: FindExecutionLogArgs): Promise<Array<SavedObjectsFindResult<IRuleStatusSOAttributes>>>;
  /** @deprecated */
  findBulk(args: FindBulkExecutionLogArgs): Promise<FindBulkExecutionLogResponse>;

  getLastFailures(args: GetLastFailuresArgs): Promise<IRuleStatusSOAttributes[]>;
  getCurrentStatus(args: GetCurrentStatusArgs): Promise<IRuleStatusSOAttributes | undefined>;
  getCurrentStatusBulk(args: GetCurrentStatusBulkArgs): Promise<GetCurrentStatusBulkResult>;

  deleteCurrentStatus(ruleId: string): Promise<void>;

  logStatusChange(args: LogStatusChangeArgs): Promise<void>;
}

/** @deprecated */
export interface FindExecutionLogArgs {
  ruleId: string;
  spaceId: string;
  logsCount?: number;
}

/** @deprecated */
export interface FindBulkExecutionLogArgs {
  ruleIds: string[];
  spaceId: string;
  logsCount?: number;
}

/** @deprecated */
export interface FindBulkExecutionLogResponse {
  [ruleId: string]: IRuleStatusSOAttributes[] | undefined;
}

export interface GetLastFailuresArgs {
  ruleId: string;
  spaceId: string;
}

export interface GetCurrentStatusArgs {
  ruleId: string;
  spaceId: string;
}

export interface GetCurrentStatusBulkArgs {
  ruleIds: string[];
  spaceId: string;
}

export interface GetCurrentStatusBulkResult {
  [ruleId: string]: IRuleStatusSOAttributes;
}

export interface CreateExecutionLogArgs {
  attributes: IRuleStatusSOAttributes;
  spaceId: string;
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

export interface LogExecutionMetricsArgs {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  spaceId: string;
  metrics: ExecutionMetrics;
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

/**
 * Custom extended log metadata that rule execution logger can attach to every log record.
 */
export type ExtMeta = LogMeta & {
  rule?: LogMeta['rule'] & {
    type?: string;
    execution?: {
      status?: RuleExecutionStatus;
    };
  };
  kibana?: {
    spaceId?: string;
  };
};
