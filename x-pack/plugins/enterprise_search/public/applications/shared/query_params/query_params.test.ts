/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseQueryParams, addQueryParameter } from '.';

describe('parseQueryParams', () => {
  it('parse query strings', () => {
    expect(parseQueryParams('?foo=bar')).toEqual({ foo: 'bar' });
    expect(parseQueryParams('?foo[]=bar&foo[]=baz')).toEqual({ foo: ['bar', 'baz'] });
  });
});

describe('addQueryParameter', () => {
  it('adds query parameters', () => {
    expect(addQueryParameter('/foo/bar', 'baz', 'buzz')).toEqual('/foo/bar?baz=buzz');
    expect(addQueryParameter('/foo/bar', 'baz', 'buzz%=1')).toEqual('/foo/bar?baz=buzz%25%3D1');
    expect(addQueryParameter('/foo/bar?t=123', 'baz', 'buzz')).toEqual('/foo/bar?baz=buzz&t=123');
  });
});
