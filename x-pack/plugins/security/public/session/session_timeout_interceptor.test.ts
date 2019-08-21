/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import fetchMock from 'fetch-mock/es5/client';
import { SessionTimeoutInterceptor } from './session_timeout_interceptor';
import { setup } from '../../../../../src/test_utils/public/http_test_setup';
import { createSessionTimeoutMock } from './session_timeout.mock';
import { AnonymousPaths } from '../anonymous_paths';

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
    const interceptor = new SessionTimeoutInterceptor(
      sessionTimeoutMock,
      new AnonymousPaths(http.basePath, [])
    );
    http.intercept(interceptor);
    fetchMock.mock('*', 200);

    await http.fetch('/foo-api');

    expect(sessionTimeoutMock.extend).toHaveBeenCalled();
  });

  test(`doesn't extend session timeouts for anonymous paths`, async () => {
    mockCurrentUrl('/foo/bar');
    const http = setupHttp('/foo');
    const sessionTimeoutMock = createSessionTimeoutMock();
    const interceptor = new SessionTimeoutInterceptor(
      sessionTimeoutMock,
      new AnonymousPaths(http.basePath, ['/bar'])
    );
    http.intercept(interceptor);
    fetchMock.mock('*', 200);

    await http.fetch('/foo-api');

    expect(sessionTimeoutMock.extend).not.toHaveBeenCalled();
  });

  test(`doesn't extend session timeouts for system api requests`, async () => {
    const http = setupHttp('/foo');
    const sessionTimeoutMock = createSessionTimeoutMock();
    const interceptor = new SessionTimeoutInterceptor(
      sessionTimeoutMock,
      new AnonymousPaths(http.basePath, [])
    );
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
    const interceptor = new SessionTimeoutInterceptor(
      sessionTimeoutMock,
      new AnonymousPaths(http.basePath, [])
    );
    http.intercept(interceptor);
    fetchMock.mock('*', 401);

    await expect(http.fetch('/foo-api')).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`);

    expect(sessionTimeoutMock.extend).toHaveBeenCalled();
  });

  test(`doesn't extend session timeouts for anonymous paths`, async () => {
    mockCurrentUrl('/foo/bar');
    const http = setupHttp('/foo');
    const sessionTimeoutMock = createSessionTimeoutMock();
    const interceptor = new SessionTimeoutInterceptor(
      sessionTimeoutMock,
      new AnonymousPaths(http.basePath, ['/bar'])
    );
    http.intercept(interceptor);
    fetchMock.mock('*', 401);

    await expect(http.fetch('/foo-api')).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`);

    expect(sessionTimeoutMock.extend).not.toHaveBeenCalled();
  });

  test(`doesn't extend session timeouts for system api requests`, async () => {
    const http = setupHttp('/foo');
    const sessionTimeoutMock = createSessionTimeoutMock();
    const interceptor = new SessionTimeoutInterceptor(
      sessionTimeoutMock,
      new AnonymousPaths(http.basePath, [])
    );
    http.intercept(interceptor);
    fetchMock.mock('*', 401);

    await expect(
      http.fetch('/foo-api', { headers: { 'kbn-system-api': 'true' } })
    ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`);

    expect(sessionTimeoutMock.extend).not.toHaveBeenCalled();
  });
});
