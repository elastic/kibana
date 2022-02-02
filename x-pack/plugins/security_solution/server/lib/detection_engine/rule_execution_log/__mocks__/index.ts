/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleExecutionLogForRoutes } from '../client_for_routes/client_interface';
import {
  IRuleExecutionLogForExecutors,
  RuleExecutionContext,
} from '../client_for_executors/client_interface';

const ruleExecutionLogForRoutesMock = {
  create: (): jest.Mocked<IRuleExecutionLogForRoutes> => ({
    getExecutionSummariesBulk: jest.fn(),
    getExecutionSummary: jest.fn(),
    clearExecutionSummary: jest.fn(),
    getLastFailures: jest.fn(),
  }),
};

const ruleExecutionLogForExecutorsMock = {
  create: (
    context: Partial<RuleExecutionContext> = {}
  ): jest.Mocked<IRuleExecutionLogForExecutors> => ({
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
  forRoutes: ruleExecutionLogForRoutesMock,
  forExecutors: ruleExecutionLogForExecutorsMock,
};
