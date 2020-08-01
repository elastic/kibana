/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from 'src/core/server/mocks';
import { registerLimitedConcurrencyRoutes } from './limited_concurrency';
import { IngestManagerConfigType } from '../index';

describe('registerLimitedConcurrencyRoutes', () => {
  test(`doesn't call registerOnPreAuth if maxConcurrentConnections is 0`, async () => {
    const mockSetup = coreMock.createSetup();
    const mockConfig = { fleet: { maxConcurrentConnections: 0 } } as IngestManagerConfigType;
    registerLimitedConcurrencyRoutes(mockSetup, mockConfig);

    expect(mockSetup.http.registerOnPreAuth).not.toHaveBeenCalled();
  });

  test(`calls registerOnPreAuth once if maxConcurrentConnections is 1`, async () => {
    const mockSetup = coreMock.createSetup();
    const mockConfig = { fleet: { maxConcurrentConnections: 1 } } as IngestManagerConfigType;
    registerLimitedConcurrencyRoutes(mockSetup, mockConfig);

    expect(mockSetup.http.registerOnPreAuth).toHaveBeenCalledTimes(1);
  });

  test(`calls registerOnPreAuth once if maxConcurrentConnections is 1000`, async () => {
    const mockSetup = coreMock.createSetup();
    const mockConfig = { fleet: { maxConcurrentConnections: 1000 } } as IngestManagerConfigType;
    registerLimitedConcurrencyRoutes(mockSetup, mockConfig);

    expect(mockSetup.http.registerOnPreAuth).toHaveBeenCalledTimes(1);
  });
});
