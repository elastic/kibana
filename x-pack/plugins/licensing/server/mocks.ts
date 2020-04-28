/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BehaviorSubject } from 'rxjs';
import { LicensingPluginSetup, LicensingPluginStart } from './types';
import { licenseMock } from '../common/licensing.mock';
import { featureUsageMock } from './services/feature_usage_service.mock';

const createSetupMock = (): jest.Mocked<LicensingPluginSetup> => {
  const license = licenseMock.createLicense();
  const mock = {
    license$: new BehaviorSubject(license),
    refresh: jest.fn(),
    createLicensePoller: jest.fn(),
    featureUsage: featureUsageMock.createSetup(),
  };
  mock.refresh.mockResolvedValue(license);
  mock.createLicensePoller.mockReturnValue({
    license$: mock.license$,
    refresh: mock.refresh,
  });

  return mock;
};

const createStartMock = (): jest.Mocked<LicensingPluginStart> => {
  const mock = {
    featureUsage: featureUsageMock.createStart(),
  };

  return mock;
};

export const licensingMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
  ...licenseMock,
};
