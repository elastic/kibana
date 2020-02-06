/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginSetupContract, PluginStartContract } from './plugin';

const createSetupMock = () => {
  const mock: jest.Mocked<PluginSetupContract> = {
    registerType: jest.fn(),
  };
  return mock;
};

const createStartMock = () => {
  const mock: jest.Mocked<PluginStartContract> = {
    execute: jest.fn(),
    getActionsClientWithRequest: jest.fn(),
  };
  return mock;
};

export const actionsMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
};
