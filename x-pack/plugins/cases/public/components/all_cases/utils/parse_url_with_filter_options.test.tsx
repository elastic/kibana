/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This file was contributed to by generative AI

import { parseURLWithFilterOptions } from './parse_url_with_filter_options';

describe('parseURLWithFilterOptions', () => {
  it('parses a url with search=foo', () => {
    const url = 'search=foo';
    expect(parseURLWithFilterOptions(url)).toStrictEqual({ search: 'foo' });
  });

  it('parses a url with status=foo,bar', () => {
    const url = 'status=foo,bar';
    expect(parseURLWithFilterOptions(url)).toStrictEqual({ status: ['foo', 'bar'] });
  });

  it('parses a url with status=foo', () => {
    const url = 'status=foo';
    expect(parseURLWithFilterOptions(url)).toStrictEqual({ status: ['foo'] });
  });

  it('parses a url with status=foo&status=bar', () => {
    const url = 'status=foo&status=bar';
    expect(parseURLWithFilterOptions(url)).toStrictEqual({ status: ['foo', 'bar'] });
  });

  it('parses a url with status=foo,bar&status=baz', () => {
    const url = 'status=foo,bar&status=baz';
    expect(parseURLWithFilterOptions(url)).toStrictEqual({ status: ['foo', 'bar', 'baz'] });
  });

  it('parses a url with status=foo,bar&status=baz,qux', () => {
    const url = 'status=foo,bar&status=baz,qux';
    expect(parseURLWithFilterOptions(url)).toStrictEqual({
      status: ['foo', 'bar', 'baz', 'qux'],
    });
  });

  it('parses a url with status=foo,bar&status=baz,qux&status=quux', () => {
    const url = 'status=foo,bar&status=baz,qux&status=quux';
    expect(parseURLWithFilterOptions(url)).toStrictEqual({
      status: ['foo', 'bar', 'baz', 'qux', 'quux'],
    });
  });

  it('parses a url with status=', () => {
    const url = 'status=';
    expect(parseURLWithFilterOptions(url)).toStrictEqual({ status: [] });
  });
});
