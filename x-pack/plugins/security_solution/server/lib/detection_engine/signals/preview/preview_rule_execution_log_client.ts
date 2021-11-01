/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResult } from 'kibana/server';
import {
  IRuleExecutionLogClient,
  LogStatusChangeArgs,
  LogExecutionMetricsArgs,
  FindBulkExecutionLogArgs,
  FindBulkExecutionLogResponse,
  FindExecutionLogArgs,
  GetLastFailuresArgs,
  GetCurrentStatusArgs,
  GetCurrentStatusBulkArgs,
  GetCurrentStatusBulkResult,
} from '../../rule_execution_log';
import { IRuleStatusSOAttributes } from '../../rules/types';

export const createWarningsAndErrors = () => {
  const warningsAndErrorsStore: LogStatusChangeArgs[] = [];

  const previewRuleExecutionLogClient: IRuleExecutionLogClient = {
    find(
      args: FindExecutionLogArgs
    ): Promise<Array<SavedObjectsFindResult<IRuleStatusSOAttributes>>> {
      return Promise.resolve([]);
    },

    findBulk(args: FindBulkExecutionLogArgs): Promise<FindBulkExecutionLogResponse> {
      return Promise.resolve({});
    },

    getLastFailures(args: GetLastFailuresArgs): Promise<IRuleStatusSOAttributes[]> {
      return Promise.resolve([]);
    },

    getCurrentStatus(args: GetCurrentStatusArgs): Promise<IRuleStatusSOAttributes> {
      return Promise.resolve({
        statusDate: new Date().toISOString(),
        status: null,
        lastFailureAt: null,
        lastFailureMessage: null,
        lastSuccessAt: null,
        lastSuccessMessage: null,
        lastLookBackDate: null,
        gap: null,
        bulkCreateTimeDurations: null,
        searchAfterTimeDurations: null,
      });
    },

    getCurrentStatusBulk(args: GetCurrentStatusBulkArgs): Promise<GetCurrentStatusBulkResult> {
      return Promise.resolve({});
    },

    deleteCurrentStatus(ruleId: string): Promise<void> {
      return Promise.resolve();
    },

    logStatusChange(args: LogStatusChangeArgs): Promise<void> {
      warningsAndErrorsStore.push(args);
      return Promise.resolve();
    },

    logExecutionMetrics(args: LogExecutionMetricsArgs): Promise<void> {
      return Promise.resolve();
    },
  };

  return { previewRuleExecutionLogClient, warningsAndErrorsStore };
};
