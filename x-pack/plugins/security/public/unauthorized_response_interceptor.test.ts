/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import fetchMock from 'fetch-mock/es5/client';
import { AnonymousPaths } from './anonymous_paths';
import { SessionExpired } from './session_expired';
import { setup } from '../../../../src/test_utils/public/http_test_setup';
import { UnauthorizedResponseInterceptor } from './unauthorized_response_interceptor';
jest.mock('./session_expired');

const drainPromiseQueue = () => {
  return new Promise(resolve => {
    setImmediate(resolve);
  });
};

const setupHttp = (basePath: string) => {
  const { http } = setup(injectedMetadata => {
    injectedMetadata.getBasePath.mockReturnValue(basePath);
  });
  return http;
};

afterEach(() => {
  fetchMock.restore();
});

it(`logs out 401 responses`, async () => {
  const http = setupHttp('/foo');
  const sessionExpired = new SessionExpired(http.basePath);
  const logoutPromise = new Promise(resolve => {
    jest.spyOn(sessionExpired, 'logout').mockImplementation(() => resolve());
  });
  const interceptor = new UnauthorizedResponseInterceptor(
    sessionExpired,
    new AnonymousPaths(http.basePath, [])
  );
  http.intercept(interceptor);
  fetchMock.mock('*', 401);

  let fetchResolved = false;
  let fetchRejected = false;
  http.fetch('/foo-api').then(() => (fetchResolved = true), () => (fetchRejected = true));

  await logoutPromise;
  await drainPromiseQueue();
  expect(fetchResolved).toBe(false);
  expect(fetchRejected).toBe(false);
});

it(`ignores anonymous paths`, async () => {
  const http = setupHttp('/foo');
  const sessionExpired = new SessionExpired(http.basePath);
  const interceptor = new UnauthorizedResponseInterceptor(
    sessionExpired,
    new AnonymousPaths(http.basePath, ['/bar'])
  );
  http.intercept(interceptor);
  fetchMock.mock('*', 401);

  await expect(http.fetch('/foo-api')).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`);
  expect(sessionExpired.logout).not.toHaveBeenCalled();
});

it(`ignores errors which don't have a response, for example network connectivity issues`, async () => {
  const http = setupHttp('/foo');
  const sessionExpired = new SessionExpired(http.basePath);
  const interceptor = new UnauthorizedResponseInterceptor(
    sessionExpired,
    new AnonymousPaths(http.basePath, ['/bar'])
  );
  http.intercept(interceptor);
  fetchMock.mock('*', new Promise((resolve, reject) => reject(new Error('Network is down'))));

  await expect(http.fetch('/foo-api')).rejects.toMatchInlineSnapshot(`[Error: Network is down]`);
  expect(sessionExpired.logout).not.toHaveBeenCalled();
});

it(`ignores requests which omit credentials`, async () => {
  const http = setupHttp('/foo');
  const sessionExpired = new SessionExpired(http.basePath);
  const interceptor = new UnauthorizedResponseInterceptor(
    sessionExpired,
    new AnonymousPaths(http.basePath, ['/bar'])
  );
  http.intercept(interceptor);
  fetchMock.mock('*', 401);

  await expect(http.fetch('/foo-api', { credentials: 'omit' })).rejects.toMatchInlineSnapshot(
    `[Error: Unauthorized]`
  );
  expect(sessionExpired.logout).not.toHaveBeenCalled();
});
