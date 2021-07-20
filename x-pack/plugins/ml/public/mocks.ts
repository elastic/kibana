/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlPluginSetup, MlPluginStart } from './plugin';
const createSetupContract = (): jest.Mocked<MlPluginSetup> => {
  return {
    locator: {
      getLocation: jest.fn(),
      getUrl: jest.fn(),
      useUrl: jest.fn(),
      navigate: jest.fn(),
      extract: jest.fn(),
      inject: jest.fn(),
      telemetry: jest.fn(),
      migrations: {},
    },
  };
};

const createStartContract = (): jest.Mocked<MlPluginStart> => {
  return {
    locator: {
      getLocation: jest.fn(),
      getUrl: jest.fn(),
      useUrl: jest.fn(),
      navigate: jest.fn(),
      extract: jest.fn(),
      inject: jest.fn(),
      telemetry: jest.fn(),
      migrations: {},
    },
  };
};

export const mlPluginMock = {
  createSetupContract,
  createStartContract,
};
