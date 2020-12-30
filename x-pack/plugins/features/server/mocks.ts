/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginSetupContract, PluginStartContract } from './plugin';

const createSetup = (): jest.Mocked<PluginSetupContract> => {
  return {
    getKibanaFeatures: jest.fn(),
    getElasticsearchFeatures: jest.fn(),
    getFeaturesUICapabilities: jest.fn(),
    registerKibanaFeature: jest.fn(),
    registerElasticsearchFeature: jest.fn(),
  };
};

const createStart = (): jest.Mocked<PluginStartContract> => {
  return {
    getKibanaFeatures: jest.fn(),
    getElasticsearchFeatures: jest.fn(),
  };
};

export const featuresPluginMock = {
  createSetup,
  createStart,
};
