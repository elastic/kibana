/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsClient } from './actions_client';

type ActionsClientContract = PublicMethodsOf<ActionsClient>;
export type ActionsClientMock = jest.Mocked<ActionsClientContract>;

const createActionsClientMock = () => {
  const mocked: ActionsClientMock = {
    create: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    getAll: jest.fn(),
    getBulk: jest.fn(),
    execute: jest.fn(),
    enqueueExecution: jest.fn(),
  };
  return mocked;
};

export const actionsClientMock: {
  create: () => ActionsClientMock;
} = {
  create: createActionsClientMock,
};
