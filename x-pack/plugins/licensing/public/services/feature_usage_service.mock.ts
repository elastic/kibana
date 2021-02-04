/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import {
  FeatureUsageService,
  FeatureUsageServiceSetup,
  FeatureUsageServiceStart,
} from './feature_usage_service';

const createSetupMock = (): jest.Mocked<FeatureUsageServiceSetup> => {
  const mock = {
    register: jest.fn(),
  };

  mock.register.mockImplementation(() => Promise.resolve());

  return mock;
};

const createStartMock = (): jest.Mocked<FeatureUsageServiceStart> => {
  const mock = {
    notifyUsage: jest.fn(),
  };

  mock.notifyUsage.mockImplementation(() => Promise.resolve());

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
