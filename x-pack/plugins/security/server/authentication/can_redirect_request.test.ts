/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import { ROUTE_TAG_API, ROUTE_TAG_CAN_REDIRECT } from '../routes/tags';
import { canRedirectRequest } from './can_redirect_request';

describe('can_redirect_request', () => {
  it('returns true if request does not have either a kbn-version or kbn-xsrf header', () => {
    expect(canRedirectRequest(httpServerMock.createKibanaRequest())).toBe(true);
  });

  it('returns false if request has a kbn-version header', () => {
    const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-version': 'something' } });
    expect(canRedirectRequest(request)).toBe(false);
  });

  it('returns false if request has a kbn-xsrf header', () => {
    const request = httpServerMock.createKibanaRequest({ headers: { 'kbn-xsrf': 'something' } });

    expect(canRedirectRequest(request)).toBe(false);
  });

  it('returns false for api routes', () => {
    expect(
      canRedirectRequest(httpServerMock.createKibanaRequest({ path: '/api/security/some' }))
    ).toBe(false);
  });

  it('returns false for internal routes', () => {
    expect(
      canRedirectRequest(httpServerMock.createKibanaRequest({ path: '/internal/security/some' }))
    ).toBe(false);
  });

  it('returns true for the routes with the `security:canRedirect` tag', () => {
    for (const request of [
      httpServerMock.createKibanaRequest({ routeTags: [ROUTE_TAG_CAN_REDIRECT] }),
      httpServerMock.createKibanaRequest({ routeTags: [ROUTE_TAG_API, ROUTE_TAG_CAN_REDIRECT] }),
      httpServerMock.createKibanaRequest({
        path: '/api/security/some',
        routeTags: [ROUTE_TAG_CAN_REDIRECT],
      }),
      httpServerMock.createKibanaRequest({
        path: '/internal/security/some',
        routeTags: [ROUTE_TAG_CAN_REDIRECT],
      }),
    ]) {
      expect(canRedirectRequest(request)).toBe(true);
    }
  });
});
