/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BehaviorSubject } from 'rxjs';
import { LicensingPluginSetup } from './types';
import { licenseMock } from '../common/licensing.mock';

const createSetupMock = () => {
  const license = licenseMock.create();
  const mock: jest.Mocked<LicensingPluginSetup> = {
    license$: new BehaviorSubject(license),
    refresh: jest.fn(),
  };
  mock.refresh.mockResolvedValue(license);

  return mock;
};

export const licensingMock = {
  createSetup: createSetupMock,
  createLicense: licenseMock.create,
};
