/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract, PluginStartContract } from './plugin';
import {
  featurePrivilegeIterator,
  subFeaturePrivilegeIterator,
} from './feature_privilege_iterator';

const createSetup = (): jest.Mocked<PluginSetupContract> => {
  return {
    getKibanaFeatures: jest.fn(),
    getElasticsearchFeatures: jest.fn(),
    getFeaturesUICapabilities: jest.fn(),
    registerKibanaFeature: jest.fn(),
    registerElasticsearchFeature: jest.fn(),
    enableReportingUiCapabilities: jest.fn(),
    featurePrivilegeIterator: jest.fn().mockImplementation(featurePrivilegeIterator),
    subFeaturePrivilegeIterator: jest.fn().mockImplementation(subFeaturePrivilegeIterator),
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
