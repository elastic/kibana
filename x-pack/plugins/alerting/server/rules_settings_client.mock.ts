/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesSettingsClientApi, RulesSettingsFlappingClientApi } from './types';

export type RulesSettingsClientMock = jest.Mocked<RulesSettingsClientApi>;
export type RulesSettingsFlappingClientMock = jest.Mocked<RulesSettingsFlappingClientApi>;

// Warning: Becareful when resetting all mocks in tests as it would clear
// the mock return value on the flapping
const createRulesSettingsClientMock = () => {
  const flappingMocked: RulesSettingsFlappingClientMock = {
    get: jest.fn(),
    update: jest.fn(),
  };
  const mocked: RulesSettingsClientMock = {
    get: jest.fn(),
    create: jest.fn(),
    flapping: jest.fn().mockReturnValue(flappingMocked),
  };
  return mocked;
};

export const rulesSettingsClientMock: {
  create: () => RulesSettingsClientMock;
} = {
  create: createRulesSettingsClientMock,
};
