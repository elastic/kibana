/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleExecutionLogClient } from '../types';

export const RuleExecutionLogClient = jest
  .fn<jest.Mocked<IRuleExecutionLogClient>, []>()
  .mockImplementation(() => {
    return {
      find: jest.fn(),
      findBulk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      logStatusChange: jest.fn(),
      logExecutionMetric: jest.fn(),
    };
  });
