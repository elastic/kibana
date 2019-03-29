/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { requestFixture } from './__tests__/__fixtures__/request';
import { canRedirectRequest } from './can_redirect_request';

describe('lib/can_redirect_request', () => {
  it('returns true if request does not have either a kbn-version or kbn-xsrf header', () => {
    expect(canRedirectRequest(requestFixture())).toBe(true);
  });

  it('returns false if request has a kbn-version header', () => {
    const request = requestFixture();
    request.raw.req.headers['kbn-version'] = 'something';

    expect(canRedirectRequest(request)).toBe(false);
  });

  it('returns false if request has a kbn-xsrf header', () => {
    const request = requestFixture();
    request.raw.req.headers['kbn-xsrf'] = 'something';

    expect(canRedirectRequest(request)).toBe(false);
  });
});
