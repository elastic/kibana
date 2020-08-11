/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPublicUrl } from './';

describe('Enterprise Search URL helper', () => {
  const httpMock = { get: jest.fn() } as any;

  it('calls and returns the public URL API endpoint', async () => {
    httpMock.get.mockImplementationOnce(() => ({ publicUrl: 'http://some.vanity.url' }));

    expect(await getPublicUrl(httpMock)).toEqual('http://some.vanity.url');
  });

  it('strips trailing slashes', async () => {
    httpMock.get.mockImplementationOnce(() => ({ publicUrl: 'http://trailing.slash/' }));

    expect(await getPublicUrl(httpMock)).toEqual('http://trailing.slash');
  });

  // For the most part, error logging/handling is done on the server side.
  // On the front-end, we should simply gracefully fall back to config.host
  // if we can't fetch a public URL
  it('falls back to an empty string', async () => {
    expect(await getPublicUrl(httpMock)).toEqual('');
  });
});
