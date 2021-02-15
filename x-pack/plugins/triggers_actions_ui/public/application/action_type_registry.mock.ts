/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeRegistryContract } from '../types';

const createActionTypeRegistryMock = () => {
  const mocked: jest.Mocked<ActionTypeRegistryContract> = {
    has: jest.fn((x) => true),
    register: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  };
  return mocked;
};

export const actionTypeRegistryMock = {
  create: createActionTypeRegistryMock,
};
