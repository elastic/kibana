/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from '../../../containers/constants';

import { parseUrlParams } from './parse_url_params';

describe('parseUrlParams', () => {
  const { customFields, ...restFilterOptions } = DEFAULT_FILTER_OPTIONS;
  // @ts-expect-error: filter options and query params are a valid record
  const defaultValuesAsURL = new URLSearchParams({
    ...restFilterOptions,
    ...DEFAULT_QUERY_PARAMS,
  });

  it('parses the default filter options and query params correctly', () => {
    expect(parseUrlParams(defaultValuesAsURL)).toMatchInlineSnapshot(`
      Object {
        "assignees": Array [],
        "category": Array [],
        "owner": Array [],
        "page": Array [
          "1",
        ],
        "perPage": Array [
          "10",
        ],
        "reporters": Array [],
        "search": Array [],
        "searchFields": Array [
          "title",
          "description",
        ],
        "severity": Array [],
        "sortField": Array [
          "createdAt",
        ],
        "sortOrder": Array [
          "desc",
        ],
        "status": Array [],
        "tags": Array [],
      }
    `);
  });

  it('parses a mix of fields correctly and splits them correctly', () => {
    const url =
      'assignees=elastic&tags=a,b&owner=cases&category=&reporters=elastic&reporters=test&status=open&search=My title';

    expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
      Object {
        "assignees": Array [
          "elastic",
        ],
        "category": Array [],
        "owner": Array [
          "cases",
        ],
        "reporters": Array [
          "elastic",
          "test",
        ],
        "search": Array [
          "My title",
        ],
        "status": Array [
          "open",
        ],
        "tags": Array [
          "a",
          "b",
        ],
      }
    `);
  });

  it('parses empty query params correctly', () => {
    expect(parseUrlParams(new URLSearchParams())).toMatchInlineSnapshot(`Object {}`);
  });

  it('parses an empty string correctly', () => {
    expect(parseUrlParams(new URLSearchParams(''))).toMatchInlineSnapshot(`Object {}`);
  });

  it('parses a string field with empty value', () => {
    expect(parseUrlParams(new URLSearchParams('foo='))).toMatchInlineSnapshot(`
      Object {
        "foo": Array [],
      }
    `);
  });

  it('parses a url with status=foo,bar', () => {
    const url = 'status=foo,bar';

    expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
      Object {
        "status": Array [
          "foo",
          "bar",
        ],
      }
    `);
  });

  it('parses a url with status=foo', () => {
    const url = 'status=foo';

    expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
      Object {
        "status": Array [
          "foo",
        ],
      }
    `);
  });

  it('parses a url with status=foo&status=bar', () => {
    const url = 'status=foo&status=bar';

    expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
      Object {
        "status": Array [
          "foo",
          "bar",
        ],
      }
    `);
  });

  it('parses a url with status=foo,bar&status=baz', () => {
    const url = 'status=foo,bar&status=baz';

    expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
      Object {
        "status": Array [
          "foo",
          "bar",
          "baz",
        ],
      }
    `);
  });

  it('parses a url with status=foo,bar&status=baz,qux', () => {
    const url = 'status=foo,bar&status=baz,qux';

    expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
      Object {
        "status": Array [
          "foo",
          "bar",
          "baz",
          "qux",
        ],
      }
    `);
  });

  it('parses a url with status=foo,bar&status=baz,qux&status=quux', () => {
    const url = 'status=foo,bar&status=baz,qux&status=quux';

    expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
      Object {
        "status": Array [
          "foo",
          "bar",
          "baz",
          "qux",
          "quux",
        ],
      }
    `);
  });
});
