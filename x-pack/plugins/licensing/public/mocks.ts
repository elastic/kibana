/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BehaviorSubject } from 'rxjs';
import { LicensingPluginSetup, LicensingPluginStart } from './types';
import { licenseMock } from '../common/licensing.mock';
import { featureUsageMock } from './services/feature_usage_service.mock';

const createSetupMock = () => {
  const license = licenseMock.createLicense();
  const mock: jest.Mocked<LicensingPluginSetup> = {
    license$: new BehaviorSubject(license),
    refresh: jest.fn(),
    featureUsage: featureUsageMock.createSetup(),
  };
  mock.refresh.mockResolvedValue(license);

  return mock;
};

const createStartMock = () => {
  const license = licenseMock.createLicense();
  const mock: jest.Mocked<LicensingPluginStart> = {
    license$: new BehaviorSubject(license),
    refresh: jest.fn(),
    featureUsage: featureUsageMock.createStart(),
  };
  mock.refresh.mockResolvedValue(license);

  return mock;
};

export const licensingMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
  ...licenseMock,
};
