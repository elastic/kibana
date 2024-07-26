/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type {
  IRuleMonitoringService,
  RuleExecutionContext,
  StatusChangeArgs,
} from '../../../rule_monitoring';

export interface IPreviewRuleExecutionLogger {
  factory: IRuleMonitoringService['createRuleExecutionLogClientForExecutors'];
}

export const createPreviewRuleExecutionLogger = (
  loggedStatusChanges: Array<RuleExecutionContext & StatusChangeArgs>,
  logger?: Logger
): IPreviewRuleExecutionLogger => {
  return {
    factory: ({ context }) => {
      const spyLogger = {
        context,

        trace: logger?.error ?? console.error,
        debug: logger?.error ?? console.error,
        info: logger?.error ?? console.error,
        warn: logger?.error ?? console.error,
        error: logger?.error ?? console.error,

        logStatusChange: (args: StatusChangeArgs): Promise<void> => {
          loggedStatusChanges.push({ ...context, ...args });
          return Promise.resolve();
        },
      };

      return Promise.resolve(spyLogger);
    },
  };
};
