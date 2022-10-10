/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRuleExecutionEventsResponseMock,
  getRuleExecutionResultsResponseMock,
  ruleExecutionSummaryMock,
} from '../../../../../../../common/detection_engine/rule_monitoring/mocks';

import type { IRuleExecutionLogForRoutes } from '../client_for_routes/client_interface';
import type {
  IRuleExecutionLogForExecutors,
  RuleExecutionContext,
} from '../client_for_executors/client_interface';

type GetExecutionSummariesBulk = IRuleExecutionLogForRoutes['getExecutionSummariesBulk'];
type GetExecutionSummary = IRuleExecutionLogForRoutes['getExecutionSummary'];
type ClearExecutionSummary = IRuleExecutionLogForRoutes['clearExecutionSummary'];
type GetExecutionEvents = IRuleExecutionLogForRoutes['getExecutionEvents'];
type GetExecutionResults = IRuleExecutionLogForRoutes['getExecutionResults'];

const ruleExecutionLogForRoutesMock = {
  create: (): jest.Mocked<IRuleExecutionLogForRoutes> => ({
    getExecutionSummariesBulk: jest
      .fn<ReturnType<GetExecutionSummariesBulk>, Parameters<GetExecutionSummariesBulk>>()
      .mockResolvedValue({
        '04128c15-0d1b-4716-a4c5-46997ac7f3bd': ruleExecutionSummaryMock.getSummarySucceeded(),
        '1ea5a820-4da1-4e82-92a1-2b43a7bece08': ruleExecutionSummaryMock.getSummaryFailed(),
      }),

    getExecutionSummary: jest
      .fn<ReturnType<GetExecutionSummary>, Parameters<GetExecutionSummary>>()
      .mockResolvedValue(ruleExecutionSummaryMock.getSummarySucceeded()),

    clearExecutionSummary: jest
      .fn<ReturnType<ClearExecutionSummary>, Parameters<ClearExecutionSummary>>()
      .mockResolvedValue(),

    getExecutionEvents: jest
      .fn<ReturnType<GetExecutionEvents>, Parameters<GetExecutionEvents>>()
      .mockResolvedValue(getRuleExecutionEventsResponseMock.getSomeResponse()),

    getExecutionResults: jest
      .fn<ReturnType<GetExecutionResults>, Parameters<GetExecutionResults>>()
      .mockResolvedValue(getRuleExecutionResultsResponseMock.getSomeResponse()),
  }),
};

const ruleExecutionLogForExecutorsMock = {
  create: (
    context: Partial<RuleExecutionContext> = {}
  ): jest.Mocked<IRuleExecutionLogForExecutors> => ({
    context: {
      executionId: context.executionId ?? 'some execution id',
      ruleId: context.ruleId ?? 'some rule id',
      ruleUuid: context.ruleUuid ?? 'some rule uuid',
      ruleName: context.ruleName ?? 'Some rule',
      ruleType: context.ruleType ?? 'some rule type',
      spaceId: context.spaceId ?? 'some space id',
    },

    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),

    logStatusChange: jest.fn(),
  }),
};

export const ruleExecutionLogMock = {
  forRoutes: ruleExecutionLogForRoutesMock,
  forExecutors: ruleExecutionLogForExecutorsMock,
};
