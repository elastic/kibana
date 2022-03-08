/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuleExecutionLogForExecutorsFactory,
  RuleExecutionContext,
  StatusChangeArgs,
} from '../../rule_execution_log';

export interface IPreviewRuleExecutionLogger {
  factory: RuleExecutionLogForExecutorsFactory;

  logged: {
    statusChanges: Array<RuleExecutionContext & StatusChangeArgs>;
  };

  clearLogs(): void;
}

export const createPreviewRuleExecutionLogger = () => {
  let logged: IPreviewRuleExecutionLogger['logged'] = {
    statusChanges: [],
  };

  const factory: RuleExecutionLogForExecutorsFactory = (
    savedObjectsClient,
    eventLogService,
    logger,
    context
  ) => {
    return {
      context,

      logStatusChange(args: StatusChangeArgs): Promise<void> {
        logged.statusChanges.push({ ...context, ...args });
        return Promise.resolve();
      },
    };
  };

  const clearLogs = (): void => {
    logged = {
      statusChanges: [],
    };
  };

  return { factory, logged, clearLogs };
};
