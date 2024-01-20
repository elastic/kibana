/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from '../../../containers/constants';

import { parseAllCasesURL } from './parse_all_cases_url';

describe('parseAllCasesURL', () => {
  const { customFields, ...restFilterOptions } = DEFAULT_FILTER_OPTIONS;
  // @ts-expect-error: filter options and query params are a valid record
  const defaultValuesAsURL = new URLSearchParams({
    ...restFilterOptions,
    ...DEFAULT_QUERY_PARAMS,
  }).toString();

  it('parses the default filter options and query params correctly', () => {
    expect(parseAllCasesURL(defaultValuesAsURL)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "assignees": Array [],
          "category": Array [],
          "owner": Array [],
          "reporters": Array [],
          "search": "",
          "searchFields": Array [
            "title",
            "description",
          ],
          "severity": Array [],
          "status": Array [],
          "tags": Array [],
        },
        "queryParams": Object {
          "page": 1,
          "perPage": 10,
          "sortField": "createdAt",
          "sortOrder": "desc",
        },
      }
    `);
  });

  it('parses a mix of fields correctly and splits them correctly', () => {
    const url =
      'assignees=elastic&tags=a,b&owner=cases&category=&reporters=elastic&reporters=test&status=open&search=My title';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
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
          "search": "My title",
          "status": Array [
            "open",
          ],
          "tags": Array [
            "a",
            "b",
          ],
        },
        "queryParams": Object {},
      }
    `);
  });

  it('parses a string field with empty value', () => {
    const url = 'search=&sortField';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "search": "",
        },
        "queryParams": Object {
          "sortField": "",
        },
      }
    `);
  });

  it('parses an empty string correctly', () => {
    const url = '';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {},
        "queryParams": Object {},
      }
    `);
  });

  it('parses string with invalid format correctly', () => {
    const url = 'invalid-format in this url';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {},
        "queryParams": Object {},
      }
    `);
  });

  it('does not return unknown values', () => {
    const url = 'foo=bar';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {},
        "queryParams": Object {},
      }
    `);
  });

  it('parses a url with search=foo', () => {
    const url = 'search=foo';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "search": "foo",
        },
        "queryParams": Object {},
      }
    `);
  });

  it('parses a url with status=foo,bar', () => {
    const url = 'status=foo,bar';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "status": Array [
            "foo",
            "bar",
          ],
        },
        "queryParams": Object {},
      }
    `);
  });

  it('parses a url with status=foo', () => {
    const url = 'status=foo';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "status": Array [
            "foo",
          ],
        },
        "queryParams": Object {},
      }
    `);
  });

  it('parses a url with status=foo&status=bar', () => {
    const url = 'status=foo&status=bar';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "status": Array [
            "foo",
            "bar",
          ],
        },
        "queryParams": Object {},
      }
    `);
  });

  it('parses a url with status=foo,bar&status=baz', () => {
    const url = 'status=foo,bar&status=baz';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "status": Array [
            "foo",
            "bar",
            "baz",
          ],
        },
        "queryParams": Object {},
      }
    `);
  });

  it('parses a url with status=foo,bar&status=baz,qux', () => {
    const url = 'status=foo,bar&status=baz,qux';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "status": Array [
            "foo",
            "bar",
            "baz",
            "qux",
          ],
        },
        "queryParams": Object {},
      }
    `);
  });

  it('parses a url with status=foo,bar&status=baz,qux&status=quux', () => {
    const url = 'status=foo,bar&status=baz,qux&status=quux';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {
          "status": Array [
            "foo",
            "bar",
            "baz",
            "qux",
            "quux",
          ],
        },
        "queryParams": Object {},
      }
    `);
  });

  it('parses a url with status=', () => {
    const url = 'status=';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
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

    expect(parseAllCasesURL(url).queryParams.page).toBe(1);
  });

  it('converts perPage to integer correctly', () => {
    const url = 'perPage=2';

    expect(parseAllCasesURL(url).queryParams.perPage).toBe(2);
  });

  it('sets the defaults to page and perPage correctly if they are not numbers', () => {
    const url = 'page=foo&perPage=bar';

    expect(parseAllCasesURL(url).queryParams.page).toBe(DEFAULT_QUERY_PARAMS.page);
    expect(parseAllCasesURL(url).queryParams.perPage).toBe(DEFAULT_QUERY_PARAMS.perPage);
  });

  it('does not return the page and perPage if they are not defined', () => {
    const url = 'page=&perPage=';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {},
        "queryParams": Object {},
      }
    `);
  });

  it('ignores the customFields keyword in the URL', () => {
    const url = 'customFields=foo';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
      Object {
        "filterOptions": Object {},
        "queryParams": Object {},
      }
    `);
  });

  it('parses custom fields correctly', () => {
    const url =
      'cf_my-custom-field-1=foo&cf_my-custom-field-2=bar,baz&cf_my-custom-field-1=qux&cf_my-custom-field-4=';

    expect(parseAllCasesURL(url)).toMatchInlineSnapshot(`
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
