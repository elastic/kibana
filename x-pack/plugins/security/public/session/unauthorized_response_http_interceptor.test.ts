/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import fetchMock from 'fetch-mock/es5/client';
import { SessionExpired } from './session_expired';
import { setup } from '../../../../../src/test_utils/public/http_test_setup';
import { UnauthorizedResponseHttpInterceptor } from './unauthorized_response_http_interceptor';
jest.mock('./session_expired');

const drainPromiseQueue = () => {
  return new Promise(resolve => {
    setImmediate(resolve);
  });
};

const mockCurrentUrl = (url: string) => window.history.pushState({}, '', url);

const setupHttp = (basePath: string) => {
  const { http } = setup(injectedMetadata => {
    injectedMetadata.getBasePath.mockReturnValue(basePath);
  });
  return http;
};
const tenant = '';

afterEach(() => {
  fetchMock.restore();
});

it(`logs out 401 responses`, async () => {
  const http = setupHttp('/foo');
  const sessionExpired = new SessionExpired(`${http.basePath}/logout`, tenant);
  const logoutPromise = new Promise(resolve => {
    jest.spyOn(sessionExpired, 'logout').mockImplementation(() => resolve());
  });
  const interceptor = new UnauthorizedResponseHttpInterceptor(sessionExpired, http.anonymousPaths);
  http.intercept(interceptor);
  fetchMock.mock('*', 401);

  let fetchResolved = false;
  let fetchRejected = false;
  http.fetch('/foo-api').then(
    () => (fetchResolved = true),
    () => (fetchRejected = true)
  );

  await logoutPromise;
  await drainPromiseQueue();
  expect(fetchResolved).toBe(false);
  expect(fetchRejected).toBe(false);
});

it(`ignores anonymous paths`, async () => {
  mockCurrentUrl('/foo/bar');
  const http = setupHttp('/foo');
  const { anonymousPaths } = http;
  anonymousPaths.register('/bar');
  const sessionExpired = new SessionExpired(`${http.basePath}/logout`, tenant);
  const interceptor = new UnauthorizedResponseHttpInterceptor(sessionExpired, anonymousPaths);
  http.intercept(interceptor);
  fetchMock.mock('*', 401);

  await expect(http.fetch('/foo-api')).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`);
  expect(sessionExpired.logout).not.toHaveBeenCalled();
});

it(`ignores errors which don't have a response, for example network connectivity issues`, async () => {
  const http = setupHttp('/foo');
  const sessionExpired = new SessionExpired(`${http.basePath}/logout`, tenant);
  const interceptor = new UnauthorizedResponseHttpInterceptor(sessionExpired, http.anonymousPaths);
  http.intercept(interceptor);
  fetchMock.mock('*', new Promise((resolve, reject) => reject(new Error('Network is down'))));

  await expect(http.fetch('/foo-api')).rejects.toMatchInlineSnapshot(`[Error: Network is down]`);
  expect(sessionExpired.logout).not.toHaveBeenCalled();
});

it(`ignores requests which omit credentials`, async () => {
  const http = setupHttp('/foo');
  const sessionExpired = new SessionExpired(`${http.basePath}/logout`, tenant);
  const interceptor = new UnauthorizedResponseHttpInterceptor(sessionExpired, http.anonymousPaths);
  http.intercept(interceptor);
  fetchMock.mock('*', 401);

  await expect(http.fetch('/foo-api', { credentials: 'omit' })).rejects.toMatchInlineSnapshot(
    `[Error: Unauthorized]`
  );
  expect(sessionExpired.logout).not.toHaveBeenCalled();
});
