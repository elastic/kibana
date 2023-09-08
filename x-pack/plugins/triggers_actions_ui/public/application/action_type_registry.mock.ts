/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ActionTypeModel, ActionTypeRegistryContract } from '../types';

const createActionTypeRegistryMock = () => {
  const mocked: jest.Mocked<ActionTypeRegistryContract> = {
    has: jest.fn((x) => true),
    register: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  };
  return mocked;
};

const mockedActionParamsFields = lazy(async () => ({
  default() {
    return React.createElement(React.Fragment);
  },
}));

const createMockActionTypeModel = (actionType: Partial<ActionTypeModel> = {}): ActionTypeModel => {
  const id = uuidv4();
  return {
    id,
    iconClass: `iconClass-${id}`,
    selectMessage: `selectMessage-${id}`,
    validateParams: jest.fn(),
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
    ...actionType,
  };
};

export const actionTypeRegistryMock = {
  create: createActionTypeRegistryMock,
  createMockActionTypeModel,
};
