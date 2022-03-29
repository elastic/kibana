/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetch, arrayBufferFetch } from './fetch';

describe('fetch', () => {
  it('test fetch headers', () => {
    // workaround until https://github.com/axios/axios/pull/4557 is merged
    const headers = fetch.defaults.headers as unknown as Record<string, unknown>;
    expect(headers.Accept).toBe('application/json');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['kbn-xsrf']).toBe('professionally-crafted-string-of-text');
  });

  it('test arrayBufferFetch headers', () => {
    // workaround until https://github.com/axios/axios/pull/4557 is merged
    const headers = fetch.defaults.headers as unknown as Record<string, unknown>;
    expect(headers.Accept).toBe('application/json');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['kbn-xsrf']).toBe('professionally-crafted-string-of-text');
    expect(arrayBufferFetch.defaults.responseType).toBe('arraybuffer');
  });
});
