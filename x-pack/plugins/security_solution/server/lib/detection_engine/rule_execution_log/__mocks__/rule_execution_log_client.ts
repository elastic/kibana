/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleExecutionLogClient } from '../rule_execution_log_client/client_interface';
import {
  IRuleExecutionLogger,
  RuleExecutionContext,
} from '../rule_execution_logger/logger_interface';

const ruleExecutionLogClientMock = {
  create: (): jest.Mocked<IRuleExecutionLogClient> => ({
    getExecutionSummariesBulk: jest.fn(),
    getExecutionSummary: jest.fn(),
    clearExecutionSummary: jest.fn(),
    getLastFailures: jest.fn(),
  }),
};

const ruleExecutionLoggerMock = {
  create: (context: Partial<RuleExecutionContext> = {}): jest.Mocked<IRuleExecutionLogger> => ({
    context: {
      executionId: context.executionId ?? 'some execution id',
      ruleId: context.ruleId ?? 'some rule id',
      ruleName: context.ruleName ?? 'Some rule',
      ruleType: context.ruleType ?? 'some rule type',
      spaceId: context.spaceId ?? 'some space id',
    },

    logStatusChange: jest.fn(),
  }),
};

export const ruleExecutionLogMock = {
  client: ruleExecutionLogClientMock,
  logger: ruleExecutionLoggerMock,
};
