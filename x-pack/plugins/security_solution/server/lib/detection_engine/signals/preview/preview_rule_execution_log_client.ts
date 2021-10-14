/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResult } from 'kibana/server';
import {
  LogExecutionMetricsArgs,
  RuleExecutionLogClient,
  FindBulkExecutionLogArgs,
  FindBulkExecutionLogResponse,
  FindExecutionLogArgs,
  LogStatusChangeArgs,
  UpdateExecutionLogArgs,
} from '../../rule_execution_log';
import { IRuleStatusSOAttributes } from '../../rules/types';

export const createWarningsAndErrors = () => {
  const warningsAndErrorsStore: LogStatusChangeArgs[] = [];

  const previewRuleExecutionLogClient: RuleExecutionLogClient = {
    // TODO: how can we remove the ts-ignore below?
    // @ts-ignore
    client: undefined,
    async delete(id: string): Promise<void> {
      return Promise.resolve(undefined);
    },
    async find(
      args: FindExecutionLogArgs
    ): Promise<Array<SavedObjectsFindResult<IRuleStatusSOAttributes>>> {
      return Promise.resolve([]);
    },
    async findBulk(args: FindBulkExecutionLogArgs): Promise<FindBulkExecutionLogResponse> {
      return Promise.resolve({});
    },
    async logStatusChange(args: LogStatusChangeArgs): Promise<void> {
      warningsAndErrorsStore.push(args);
      return Promise.resolve(undefined);
    },
    async update(args: UpdateExecutionLogArgs): Promise<void> {
      return Promise.resolve(undefined);
    },
    async logExecutionMetrics(args: LogExecutionMetricsArgs): Promise<void> {
      return Promise.resolve(undefined);
    },
  };

  return { previewRuleExecutionLogClient, warningsAndErrorsStore };
};
