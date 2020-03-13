/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeaturesPluginSetup, FeaturesPluginStart } from './plugin';

const createSetup = (): jest.Mocked<FeaturesPluginSetup> => {
  return {
    getFeatures: jest.fn(),
  };
};

const createStart = (): jest.Mocked<FeaturesPluginStart> => {
  return {
    getFeatures: jest.fn(),
  };
};

export const featuresPluginMock = {
  createSetup,
  createStart,
};
