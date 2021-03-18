/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from 'src/core/server/mocks';

import { API_ROUTES_SUPPORTING_REDIRECTS, canRedirectRequest } from './can_redirect_request';

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

  it('returns true for selected api routes', () => {
    for (const path of API_ROUTES_SUPPORTING_REDIRECTS) {
      expect(canRedirectRequest(httpServerMock.createKibanaRequest({ path }))).toBe(true);
    }
  });
});
