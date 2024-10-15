/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetch, arrayBufferFetch } from './fetch';
import { AxiosInstance, HeadersDefaults } from 'axios';

describe('fetch', () => {
  // WORKAROUND: wrong Axios types, should be fixed in https://github.com/axios/axios/pull/4475
  const getDefaultHeader = (axiosInstance: AxiosInstance, headerName: string) =>
    (axiosInstance.defaults.headers as HeadersDefaults & Record<string, string>)[headerName];

  it('test fetch headers', () => {
    expect(getDefaultHeader(fetch, 'Accept')).toBe('application/json');
    expect(getDefaultHeader(fetch, 'Content-Type')).toBe('application/json');
    expect(getDefaultHeader(fetch, 'kbn-xsrf')).toBe('professionally-crafted-string-of-text');
  });

  it('test arrayBufferFetch headers', () => {
    expect(getDefaultHeader(arrayBufferFetch, 'Accept')).toBe('application/json');
    expect(getDefaultHeader(arrayBufferFetch, 'Content-Type')).toBe('application/json');
    expect(getDefaultHeader(arrayBufferFetch, 'kbn-xsrf')).toBe(
      'professionally-crafted-string-of-text'
    );
    expect(arrayBufferFetch.defaults.responseType).toBe('arraybuffer');
  });
});
