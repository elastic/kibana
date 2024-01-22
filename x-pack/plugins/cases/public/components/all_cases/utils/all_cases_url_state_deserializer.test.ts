/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_QUERY_PARAMS } from '../../../containers/constants';

import { allCasesUrlStateDeserializer } from './all_cases_url_state_deserializer';
import { parseUrlParams } from './parse_url_params';

describe('allCasesUrlStateDeserializer', () => {
  it('parses string with invalid format correctly', () => {
    const url = 'invalid-format in this url';

    expect(allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))))
      .toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {},
        "queryParams": Object {},
      }
    `);
  });

  it('does not return unknown values', () => {
    const url = 'foo=bar';

    expect(allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))))
      .toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {},
        "queryParams": Object {},
      }
    `);
  });

  it('parses a url with search=foo', () => {
    const url = 'search=foo';

    expect(allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))))
      .toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "search": "foo",
        },
        "queryParams": Object {},
      }
    `);
  });

  it('parses a url with status=', () => {
    const url = 'status=';

    expect(allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))))
      .toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "status": Array [],
        },
        "queryParams": Object {},
      }
    `);
  });

  it('converts page to integer correctly', () => {
    const url = 'page=1';

    expect(
      allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))).queryParams.page
    ).toBe(1);
  });

  it('sets perPage to the maximum allowed value if it is set to over the limit', () => {
    const url = 'perPage=1000';

    expect(
      allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))).queryParams.perPage
    ).toBe(100);
  });

  it('converts perPage to integer correctly', () => {
    const url = 'perPage=2';

    expect(
      allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))).queryParams.perPage
    ).toBe(2);
  });

  it('sets the defaults to page and perPage correctly if they are not numbers', () => {
    const url = 'page=foo&perPage=bar';

    expect(
      allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))).queryParams.page
    ).toBe(DEFAULT_QUERY_PARAMS.page);
    expect(
      allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))).queryParams.perPage
    ).toBe(DEFAULT_QUERY_PARAMS.perPage);
  });

  it('does not return the page and perPage if they are not defined', () => {
    const url = 'page=&perPage=';

    expect(allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))))
      .toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {},
        "queryParams": Object {},
      }
    `);
  });

  it('sets the sortOrder correctly', () => {
    const url = 'sortOrder=asc';

    expect(
      allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))).queryParams.sortOrder
    ).toBe('asc');
  });

  it('sets the sortOrder to the default value if it is invalid', () => {
    const url = 'sortOrder=invalid';

    expect(
      allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))).queryParams.sortOrder
    ).toBe('desc');
  });

  it('ignores the customFields keyword in the URL', () => {
    const url = 'customFields=foo';

    expect(allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))))
      .toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {},
        "queryParams": Object {},
      }
    `);
  });

  it('parses custom fields correctly', () => {
    const url =
      'cf_my-custom-field-1=foo&cf_my-custom-field-2=bar,baz&cf_my-custom-field-1=qux&cf_my-custom-field-4=';

    expect(allCasesUrlStateDeserializer(parseUrlParams(new URLSearchParams(url))))
      .toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "customFields": Object {
            "my-custom-field-1": Object {
              "options": Array [
                "foo",
                "qux",
              ],
              "type": "text",
            },
            "my-custom-field-2": Object {
              "options": Array [
                "bar",
                "baz",
              ],
              "type": "text",
            },
            "my-custom-field-4": Object {
              "options": Array [],
              "type": "text",
            },
          },
        },
        "queryParams": Object {},
      }
    `);
  });
});
