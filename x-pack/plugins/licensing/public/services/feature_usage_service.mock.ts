/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FeatureUsageService,
  FeatureUsageServiceSetup,
  FeatureUsageServiceStart,
} from './feature_usage_service';

const createSetupMock = (): jest.Mocked<FeatureUsageServiceSetup> => {
  const mock = {
    register: jest.fn(),
  };

  return mock;
};

const createStartMock = (): jest.Mocked<FeatureUsageServiceStart> => {
  const mock = {
    notifyUsage: jest.fn(),
  };

  return mock;
};

const createServiceMock = (): jest.Mocked<PublicMethodsOf<FeatureUsageService>> => {
  const mock = {
    setup: jest.fn(),
    start: jest.fn(),
  };

  mock.setup.mockImplementation(() => createSetupMock());
  mock.start.mockImplementation(() => createStartMock());

  return mock;
};

export const featureUsageMock = {
  create: createServiceMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
};
