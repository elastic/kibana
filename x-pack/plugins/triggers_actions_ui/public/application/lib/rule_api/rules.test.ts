/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { loadRules } from './rules';

const http = httpServiceMock.createStartContract();

describe('loadRules', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should call find API with base parameters', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadRules({ http, page: { index: 0, size: 10 } });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": undefined,
            "page": 1,
            "per_page": 10,
            "search": undefined,
            "search_fields": undefined,
            "sort_field": "name",
            "sort_order": "asc",
          },
        },
      ]
    `);
  });

  test('should call find API with searchText', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadRules({ http, searchText: 'apples', page: { index: 0, size: 10 } });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": undefined,
            "page": 1,
            "per_page": 10,
            "search": "apples",
            "search_fields": "[\\"name\\",\\"tags\\"]",
            "sort_field": "name",
            "sort_order": "asc",
          },
        },
      ]
    `);
  });

  test('should call find API with actionTypesFilter', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadRules({
      http,
      searchText: 'foo',
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": undefined,
            "page": 1,
            "per_page": 10,
            "search": "foo",
            "search_fields": "[\\"name\\",\\"tags\\"]",
            "sort_field": "name",
            "sort_order": "asc",
          },
        },
      ]
    `);
  });

  test('should call find API with typesFilter', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadRules({
      http,
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": "alert.attributes.alertTypeId:(foo or bar)",
            "page": 1,
            "per_page": 10,
            "search": undefined,
            "search_fields": undefined,
            "sort_field": "name",
            "sort_order": "asc",
          },
        },
      ]
    `);
  });

  test('should call find API with actionTypesFilter and typesFilter', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadRules({
      http,
      searchText: 'baz',
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": "alert.attributes.alertTypeId:(foo or bar)",
            "page": 1,
            "per_page": 10,
            "search": "baz",
            "search_fields": "[\\"name\\",\\"tags\\"]",
            "sort_field": "name",
            "sort_order": "asc",
          },
        },
      ]
    `);
  });

  test('should call find API with searchText and tagsFilter and typesFilter', async () => {
    const resolvedValue = {
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadRules({
      http,
      searchText: 'apples, foo, baz',
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": "alert.attributes.alertTypeId:(foo or bar)",
            "page": 1,
            "per_page": 10,
            "search": "apples, foo, baz",
            "search_fields": "[\\"name\\",\\"tags\\"]",
            "sort_field": "name",
            "sort_order": "asc",
          },
        },
      ]
    `);
  });
});
