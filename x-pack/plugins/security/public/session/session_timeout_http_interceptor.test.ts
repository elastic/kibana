/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import fetchMock from 'fetch-mock/es5/client';
import { SessionTimeoutHttpInterceptor } from './session_timeout_http_interceptor';
import { setup } from '../../../../../src/test_utils/public/http_test_setup';
import { createSessionTimeoutMock } from './session_timeout.mock';

const mockCurrentUrl = (url: string) => window.history.pushState({}, '', url);

const setupHttp = (basePath: string) => {
  const { http } = setup(injectedMetadata => {
    injectedMetadata.getBasePath.mockReturnValue(basePath);
  });
  return http;
};

afterEach(() => {
  fetchMock.restore();
});

describe('response', () => {
  test('extends session timeouts', async () => {
    const http = setupHttp('/foo');
    const sessionTimeoutMock = createSessionTimeoutMock();
    const interceptor = new SessionTimeoutHttpInterceptor(sessionTimeoutMock, http.anonymousPaths);
    http.intercept(interceptor);
    fetchMock.mock('*', 200);

    await http.fetch('/foo-api');

    expect(sessionTimeoutMock.extend).toHaveBeenCalled();
  });

  test(`doesn't extend session timeouts for anonymous paths`, async () => {
    mockCurrentUrl('/foo/bar');
    const http = setupHttp('/foo');
    const sessionTimeoutMock = createSessionTimeoutMock();
    const { anonymousPaths } = http;
    anonymousPaths.register('/bar');
    const interceptor = new SessionTimeoutHttpInterceptor(sessionTimeoutMock, anonymousPaths);
    http.intercept(interceptor);
    fetchMock.mock('*', 200);

    await http.fetch('/foo-api');

    expect(sessionTimeoutMock.extend).not.toHaveBeenCalled();
  });

  test(`doesn't extend session timeouts for system api requests`, async () => {
    const http = setupHttp('/foo');
    const sessionTimeoutMock = createSessionTimeoutMock();
    const interceptor = new SessionTimeoutHttpInterceptor(sessionTimeoutMock, http.anonymousPaths);
    http.intercept(interceptor);
    fetchMock.mock('*', 200);

    await http.fetch('/foo-api', { headers: { 'kbn-system-api': 'true' } });

    expect(sessionTimeoutMock.extend).not.toHaveBeenCalled();
  });
});

describe('responseError', () => {
  test('extends session timeouts', async () => {
    const http = setupHttp('/foo');
    const sessionTimeoutMock = createSessionTimeoutMock();
    const interceptor = new SessionTimeoutHttpInterceptor(sessionTimeoutMock, http.anonymousPaths);
    http.intercept(interceptor);
    fetchMock.mock('*', 401);

    await expect(http.fetch('/foo-api')).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`);

    expect(sessionTimeoutMock.extend).toHaveBeenCalled();
  });

  test(`doesn't extend session timeouts for anonymous paths`, async () => {
    mockCurrentUrl('/foo/bar');
    const http = setupHttp('/foo');
    const sessionTimeoutMock = createSessionTimeoutMock();
    const { anonymousPaths } = http;
    anonymousPaths.register('/bar');
    const interceptor = new SessionTimeoutHttpInterceptor(sessionTimeoutMock, anonymousPaths);
    http.intercept(interceptor);
    fetchMock.mock('*', 401);

    await expect(http.fetch('/foo-api')).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`);

    expect(sessionTimeoutMock.extend).not.toHaveBeenCalled();
  });

  test(`doesn't extend session timeouts for system api requests`, async () => {
    const http = setupHttp('/foo');
    const sessionTimeoutMock = createSessionTimeoutMock();
    const interceptor = new SessionTimeoutHttpInterceptor(sessionTimeoutMock, http.anonymousPaths);
    http.intercept(interceptor);
    fetchMock.mock('*', 401);

    await expect(
      http.fetch('/foo-api', { headers: { 'kbn-system-api': 'true' } })
    ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`);

    expect(sessionTimeoutMock.extend).not.toHaveBeenCalled();
  });

  test(`doesn't extend session timeouts when there is no response`, async () => {
    const http = setupHttp('/foo');
    const sessionTimeoutMock = createSessionTimeoutMock();
    const interceptor = new SessionTimeoutHttpInterceptor(sessionTimeoutMock, http.anonymousPaths);
    http.intercept(interceptor);
    fetchMock.mock('*', new Promise((resolve, reject) => reject(new Error('Network is down'))));

    await expect(http.fetch('/foo-api')).rejects.toMatchInlineSnapshot(`[Error: Network is down]`);

    expect(sessionTimeoutMock.extend).not.toHaveBeenCalled();
  });
});
