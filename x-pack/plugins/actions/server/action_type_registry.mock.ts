/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionTypeRegistryContract } from './types';
import { createValidationServiceMock } from './mocks';

const createActionTypeRegistryMock = () => {
  const mocked: jest.Mocked<ActionTypeRegistryContract> = {
    has: jest.fn(),
    register: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    ensureActionTypeEnabled: jest.fn(),
    isActionTypeEnabled: jest.fn(),
    isActionExecutable: jest.fn(),
    getValidationService: jest.fn(() => createValidationServiceMock()),
  };
  return mocked;
};

export const actionTypeRegistryMock = {
  create: createActionTypeRegistryMock,
};
