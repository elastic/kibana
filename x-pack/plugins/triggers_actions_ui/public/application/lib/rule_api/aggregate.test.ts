/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { loadRuleAggregations } from './aggregate';

const http = httpServiceMock.createStartContract();

describe('loadRuleAggregations', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should call aggregate API with base parameters', async () => {
    const resolvedValue = {
      rule_execution_status: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadRuleAggregations({ http });
    expect(result).toEqual({
      ruleExecutionStatus: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    });
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": undefined,
            "search": undefined,
            "search_fields": undefined,
          },
        },
      ]
    `);
  });

  test('should call aggregate API with searchText', async () => {
    const resolvedValue = {
      rule_execution_status: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadRuleAggregations({ http, searchText: 'apples' });
    expect(result).toEqual({
      ruleExecutionStatus: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    });
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": undefined,
            "search": "apples",
            "search_fields": "[\\"name\\",\\"tags\\"]",
          },
        },
      ]
    `);
  });

  test('should call aggregate API with actionTypesFilter', async () => {
    const resolvedValue = {
      rule_execution_status: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadRuleAggregations({
      http,
      searchText: 'foo',
      actionTypesFilter: ['action', 'type'],
    });
    expect(result).toEqual({
      ruleExecutionStatus: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    });
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": "(alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:type })",
            "search": "foo",
            "search_fields": "[\\"name\\",\\"tags\\"]",
          },
        },
      ]
    `);
  });

  test('should call aggregate API with typesFilter', async () => {
    const resolvedValue = {
      rule_execution_status: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadRuleAggregations({
      http,
      typesFilter: ['foo', 'bar'],
    });
    expect(result).toEqual({
      ruleExecutionStatus: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    });
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": "alert.attributes.alertTypeId:(foo or bar)",
            "search": undefined,
            "search_fields": undefined,
          },
        },
      ]
    `);
  });

  test('should call aggregate API with actionTypesFilter and typesFilter', async () => {
    const resolvedValue = {
      rule_execution_status: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadRuleAggregations({
      http,
      searchText: 'baz',
      actionTypesFilter: ['action', 'type'],
      typesFilter: ['foo', 'bar'],
    });
    expect(result).toEqual({
      ruleExecutionStatus: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    });
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": "alert.attributes.alertTypeId:(foo or bar) and (alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:type })",
            "search": "baz",
            "search_fields": "[\\"name\\",\\"tags\\"]",
          },
        },
      ]
    `);
  });
});
