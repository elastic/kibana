/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';
import { nextTick } from '@kbn/test-jest-helpers';

import { licenseMock } from '../../common/licensing/index.mock';
import { AnalyticsService } from './analytics_service';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  beforeEach(() => {
    analyticsService = new AnalyticsService();
  });

  afterEach(() => {
    localStorage.removeItem(AnalyticsService.AuthTypeInfoStorageKey);
  });

  it('reports authentication type when security is enabled', async () => {
    const mockCore = coreMock.createStart();
    mockCore.http.post.mockResolvedValue({ signature: 'some-signature', timestamp: 1234 });

    expect(localStorage.getItem(AnalyticsService.AuthTypeInfoStorageKey)).toBeNull();

    analyticsService.setup({ securityLicense: licenseMock.create({ allowLogin: true }) });
    analyticsService.start({ http: mockCore.http });

    await nextTick();

    expect(mockCore.http.post).toHaveBeenCalledTimes(1);
    expect(mockCore.http.post).toHaveBeenCalledWith(
      '/internal/security/analytics/_record_auth_type',
      { body: null }
    );
    expect(localStorage.getItem(AnalyticsService.AuthTypeInfoStorageKey)).toMatchInlineSnapshot(
      `"{\\"signature\\":\\"some-signature\\",\\"timestamp\\":1234}"`
    );
  });

  it('throttle reporting of the authentication type events', async () => {
    jest.useFakeTimers();

    const mockCore = coreMock.createStart();
    mockCore.http.post.mockResolvedValue({ signature: 'some-signature', timestamp: 1234 });

    const licenseFeatures$ = new BehaviorSubject({ allowLogin: true });
    analyticsService.setup({
      securityLicense: licenseMock.create(licenseFeatures$.asObservable()),
    });
    analyticsService.start({ http: mockCore.http });

    await nextTick();

    expect(mockCore.http.post).toHaveBeenCalledTimes(1);
    expect(mockCore.http.post).toHaveBeenCalledWith(
      '/internal/security/analytics/_record_auth_type',
      { body: null }
    );
    mockCore.http.post.mockClear();

    // Changes that lead to disabled login should be ignored.
    licenseFeatures$.next({ allowLogin: false });
    jest.runAllTimers();
    expect(mockCore.http.post).not.toHaveBeenCalled();

    // The "leading" event indicating enabled login should be reported immediately.
    licenseFeatures$.next({ allowLogin: true });
    jest.advanceTimersByTime(1000);
    licenseFeatures$.next({ allowLogin: true });
    jest.advanceTimersByTime(1000);
    licenseFeatures$.next({ allowLogin: true });
    jest.advanceTimersByTime(1000);

    expect(mockCore.http.post).toHaveBeenCalledTimes(1);
    expect(mockCore.http.post).toHaveBeenCalledWith(
      '/internal/security/analytics/_record_auth_type',
      { body: JSON.stringify({ signature: 'some-signature', timestamp: 1234 }) }
    );

    // The rest of the events should be throttled away.
    jest.runAllTimers();
    expect(mockCore.http.post).toHaveBeenCalledTimes(1);
  });

  it('sends existing authentication type info if available', async () => {
    const mockCore = coreMock.createStart();
    mockCore.http.post.mockResolvedValue({ signature: 'some-new-signature', timestamp: 5678 });

    const mockCurrentAuthTypeInfo = JSON.stringify({
      signature: 'some-signature',
      timestamp: 1234,
    });
    localStorage.setItem(AnalyticsService.AuthTypeInfoStorageKey, mockCurrentAuthTypeInfo);

    analyticsService.setup({ securityLicense: licenseMock.create({ allowLogin: true }) });
    analyticsService.start({ http: mockCore.http });

    await nextTick();

    expect(mockCore.http.post).toHaveBeenCalledTimes(1);
    expect(mockCore.http.post).toHaveBeenCalledWith(
      '/internal/security/analytics/_record_auth_type',
      { body: mockCurrentAuthTypeInfo }
    );
    expect(localStorage.getItem(AnalyticsService.AuthTypeInfoStorageKey)).toMatchInlineSnapshot(
      `"{\\"signature\\":\\"some-new-signature\\",\\"timestamp\\":5678}"`
    );
  });

  it('does not report authentication type if security is not available', async () => {
    const mockCore = coreMock.createStart();

    analyticsService.setup({ securityLicense: licenseMock.create({ allowLogin: false }) });
    analyticsService.start({ http: mockCore.http });

    await nextTick();

    expect(mockCore.http.post).not.toHaveBeenCalled();
    expect(localStorage.getItem(AnalyticsService.AuthTypeInfoStorageKey)).toBeNull();
  });

  it('does not alter stored authentication type if reporting attempt fails', async () => {
    const mockCore = coreMock.createStart();
    mockCore.http.post.mockRejectedValue(new Error('Oh no!'));

    const mockCurrentAuthTypeInfo = JSON.stringify({
      signature: 'some-signature',
      timestamp: 1234,
    });
    localStorage.setItem(AnalyticsService.AuthTypeInfoStorageKey, mockCurrentAuthTypeInfo);

    analyticsService.setup({ securityLicense: licenseMock.create({ allowLogin: true }) });
    analyticsService.start({ http: mockCore.http });

    await nextTick();

    expect(mockCore.http.post).toHaveBeenCalledTimes(1);
    expect(mockCore.http.post).toHaveBeenCalledWith(
      '/internal/security/analytics/_record_auth_type',
      { body: mockCurrentAuthTypeInfo }
    );
    expect(localStorage.getItem(AnalyticsService.AuthTypeInfoStorageKey)).toBe(
      mockCurrentAuthTypeInfo
    );
  });
});
