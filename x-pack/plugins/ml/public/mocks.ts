/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createMlUrlGeneratorMock } from './ml_url_generator/__mocks__/ml_url_generator';
import { MlPluginSetup, MlPluginStart } from './plugin';
const createSetupContract = (): jest.Mocked<MlPluginSetup> => {
  return {
    urlGenerator: createMlUrlGeneratorMock(),
  };
};

const createStartContract = (): jest.Mocked<MlPluginStart> => {
  return {
    urlGenerator: createMlUrlGeneratorMock(),
  };
};

export const mlPluginMock = {
  createSetupContract,
  createStartContract,
};
