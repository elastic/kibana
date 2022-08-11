/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { MlPluginSetup, MlPluginStart } from './plugin';

const createSetupContract = (): jest.Mocked<MlPluginSetup> => {
  return {
    locator: sharePluginMock.createLocator(),
  };
};

const createStartContract = (): jest.Mocked<MlPluginStart> => {
  return {
    locator: sharePluginMock.createLocator(),
  };
};

export const mlPluginMock = {
  createSetupContract,
  createStartContract,
};
