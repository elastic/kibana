/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleExecutionLogClient } from '../types';

export const ruleExecutionLogClientMock = {
  create: (): jest.Mocked<IRuleExecutionLogClient> => ({
    find: jest.fn(),
    findBulk: jest.fn(),

    getLastFailures: jest.fn(),
    getCurrentStatus: jest.fn(),
    getCurrentStatusBulk: jest.fn(),

    deleteCurrentStatus: jest.fn(),

    logStatusChange: jest.fn(),
    logExecutionMetrics: jest.fn(),
  }),
};

export const RuleExecutionLogClient = jest
  .fn<jest.Mocked<IRuleExecutionLogClient>, []>()
  .mockImplementation(ruleExecutionLogClientMock.create);
