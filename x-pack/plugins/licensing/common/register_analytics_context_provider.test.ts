/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, ReplaySubject, Subject } from 'rxjs';
import type { ILicense } from './types';
import { registerAnalyticsContextProvider } from './register_analytics_context_provider';

describe('registerAnalyticsContextProvider', () => {
  const analyticsClientMock = {
    registerContextProvider: jest.fn(),
  };

  let license$: Subject<ILicense>;

  beforeEach(() => {
    jest.clearAllMocks();
    license$ = new ReplaySubject<ILicense>(1);
    registerAnalyticsContextProvider(analyticsClientMock, license$);
  });

  test('should register the analytics context provider', () => {
    expect(analyticsClientMock.registerContextProvider).toHaveBeenCalledTimes(1);
  });

  test('emits a context value the moment license emits', async () => {
    license$.next({
      uid: 'uid',
      status: 'active',
      isActive: true,
      type: 'basic',
      signature: 'signature',
      isAvailable: true,
      toJSON: jest.fn(),
      getUnavailableReason: jest.fn(),
      hasAtLeast: jest.fn(),
      check: jest.fn(),
      getFeature: jest.fn(),
    });
    await expect(
      firstValueFrom(analyticsClientMock.registerContextProvider.mock.calls[0][0].context$)
    ).resolves.toEqual({
      license_id: 'uid',
      license_status: 'active',
      license_type: 'basic',
    });
  });
});
