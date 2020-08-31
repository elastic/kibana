/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BasicHTTPAuthorizationHeaderCredentials } from './basic_http_authorization_header_credentials';

const encodeToBase64 = (str: string) => Buffer.from(str).toString('base64');

describe('BasicHTTPAuthorizationHeaderCredentials.parseFromRequest()', () => {
  it('parses username from the left-side of the single colon', () => {
    const basicCredentials = BasicHTTPAuthorizationHeaderCredentials.parseFromCredentials(
      encodeToBase64('fOo:bAr')
    );
    expect(basicCredentials.username).toBe('fOo');
  });

  it('parses username from the left-side of the first colon', () => {
    const basicCredentials = BasicHTTPAuthorizationHeaderCredentials.parseFromCredentials(
      encodeToBase64('fOo:bAr:bAz')
    );
    expect(basicCredentials.username).toBe('fOo');
  });

  it('parses password from the right-side of the single colon', () => {
    const basicCredentials = BasicHTTPAuthorizationHeaderCredentials.parseFromCredentials(
      encodeToBase64('fOo:bAr')
    );
    expect(basicCredentials.password).toBe('bAr');
  });

  it('parses password from the right-side of the first colon', () => {
    const basicCredentials = BasicHTTPAuthorizationHeaderCredentials.parseFromCredentials(
      encodeToBase64('fOo:bAr:bAz')
    );
    expect(basicCredentials.password).toBe('bAr:bAz');
  });

  it('throws error if there is no colon', () => {
    expect(() => {
      BasicHTTPAuthorizationHeaderCredentials.parseFromCredentials(encodeToBase64('fOobArbAz'));
    }).toThrowErrorMatchingInlineSnapshot(
      `"Unable to parse basic authentication credentials without a colon"`
    );
  });
});

describe(`toString()`, () => {
  it('concatenates username and password using a colon and then base64 encodes the string', () => {
    const basicCredentials = new BasicHTTPAuthorizationHeaderCredentials('elastic', 'changeme');

    expect(basicCredentials.toString()).toEqual(Buffer.from(`elastic:changeme`).toString('base64')); // I don't like that this so closely mirror the actual implementation
    expect(basicCredentials.toString()).toEqual('ZWxhc3RpYzpjaGFuZ2VtZQ=='); // and I don't like that this is so opaque. Both together seem reasonable...
  });
});
