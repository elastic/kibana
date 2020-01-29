/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionExecutorContract } from './action_executor';

const createActionExecutorMock = () => {
  const mocked: jest.Mocked<ActionExecutorContract> = {
    initialize: jest.fn(),
    execute: jest.fn().mockResolvedValue({ status: 'ok', actionId: '' }),
  };
  return mocked;
};

export const actionExecutorMock = {
  create: createActionExecutorMock,
};
