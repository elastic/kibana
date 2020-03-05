/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServerMock } from '../../../../../src/core/server/http/http_server.mocks';

import { getHTTPAuthenticationScheme } from './get_http_authentication_scheme';

describe('getHTTPAuthenticationScheme', () => {
  it('returns `null` if request does not have authorization header', () => {
    expect(getHTTPAuthenticationScheme(httpServerMock.createKibanaRequest())).toBeNull();
  });

  it('returns `null` if authorization header value isn not a string', () => {
    expect(
      getHTTPAuthenticationScheme(
        httpServerMock.createKibanaRequest({
          headers: { authorization: ['Basic xxx', 'Bearer xxx'] as any },
        })
      )
    ).toBeNull();
  });

  it('returns `null` if authorization header value is an empty string', () => {
    expect(
      getHTTPAuthenticationScheme(
        httpServerMock.createKibanaRequest({ headers: { authorization: '' } })
      )
    ).toBeNull();
  });

  it('returns only scheme portion of the authorization header value in lower case', () => {
    const headerValueAndSchemeMap = [
      ['Basic xxx', 'basic'],
      ['Basic xxx yyy', 'basic'],
      ['basic xxx', 'basic'],
      ['basic', 'basic'],
      // We don't trim leading whitespaces in scheme.
      [' Basic xxx', ''],
      ['Negotiate xxx', 'negotiate'],
      ['negotiate xxx', 'negotiate'],
      ['negotiate', 'negotiate'],
      ['ApiKey xxx', 'apikey'],
      ['apikey xxx', 'apikey'],
      ['Api Key xxx', 'api'],
    ];

    for (const [authorization, scheme] of headerValueAndSchemeMap) {
      expect(
        getHTTPAuthenticationScheme(
          httpServerMock.createKibanaRequest({ headers: { authorization } })
        )
      ).toBe(scheme);
    }
  });
});
