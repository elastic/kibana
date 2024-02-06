/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from '../../../containers/constants';

import { parseUrlParams } from './parse_url_params';

describe('parseUrlParams', () => {
  const defaultValuesAsURL = new URLSearchParams({
    cases: encode({
      ...DEFAULT_FILTER_OPTIONS,
      ...DEFAULT_QUERY_PARAMS,
    }),
  });

  it('parses the default filter options and query params correctly', () => {
    expect(parseUrlParams(defaultValuesAsURL)).toMatchInlineSnapshot(`
      Object {
        "assignees": Array [],
        "category": Array [],
        "customFields": Object {},
        "owner": Array [],
        "page": 1,
        "perPage": 10,
        "reporters": Array [],
        "search": "",
        "searchFields": Array [
          "title",
          "description",
        ],
        "severity": Array [],
        "sortField": "createdAt",
        "sortOrder": "desc",
        "status": Array [],
        "tags": Array [],
      }
    `);
  });

  it('parses a mix of fields correctly', () => {
    const state = {
      assignees: ['elastic'],
      tags: ['a', 'b'],
      category: [],
      status: ['open'],
      search: 'My title',
      owner: ['cases'],
    };

    const url = `cases=${encode(state)}`;

    expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
      Object {
        "assignees": Array [
          "elastic",
        ],
        "category": Array [],
        "owner": Array [
          "cases",
        ],
        "search": "My title",
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

  it('parses an unrecognized query param correctly', () => {
    expect(parseUrlParams(new URLSearchParams('foo='))).toMatchInlineSnapshot(`Object {}`);
  });

  it('parses an empty string correctly in the cases object correctly', () => {
    expect(parseUrlParams(new URLSearchParams({ cases: '' }))).toMatchInlineSnapshot(`Object {}`);
  });

  it('parses a malformed rison url correctly', () => {
    expect(parseUrlParams(new URLSearchParams({ cases: '!' }))).toMatchInlineSnapshot(`Object {}`);
  });

  it('parses a rison url that is not an object correctly', () => {
    for (const value of ['foo', true, false, ['bar'], null, 0]) {
      expect(parseUrlParams(new URLSearchParams({ cases: encode(value) }))).toEqual({});
    }
  });

  describe('legacy URLs', () => {
    it('parses a legacy url with all legacy supported keys correctly', () => {
      const url = 'status=foo&severity=foo&page=2&perPage=50&sortField=closedAt&sortOrder=asc';

      expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
        Object {
          "page": "2",
          "perPage": "50",
          "severity": Array [
            "foo",
          ],
          "sortField": "closedAt",
          "sortOrder": "asc",
          "status": Array [
            "foo",
          ],
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
});
