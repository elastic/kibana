/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { loadRuleAggregations, loadRuleTags } from './aggregate';

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
    http.post.mockResolvedValueOnce(resolvedValue);

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
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"default_search_operator\\":\\"AND\\"}",
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
    http.post.mockResolvedValueOnce(resolvedValue);

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
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"search_fields\\":\\"[\\\\\\"name\\\\\\",\\\\\\"tags\\\\\\"]\\",\\"search\\":\\"apples\\",\\"default_search_operator\\":\\"AND\\"}",
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
    http.post.mockResolvedValueOnce(resolvedValue);

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
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"search_fields\\":\\"[\\\\\\"name\\\\\\",\\\\\\"tags\\\\\\"]\\",\\"search\\":\\"foo\\",\\"filter\\":\\"(alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:type })\\",\\"default_search_operator\\":\\"AND\\"}",
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
    http.post.mockResolvedValueOnce(resolvedValue);

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
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"filter\\":\\"alert.attributes.alertTypeId:(foo or bar)\\",\\"default_search_operator\\":\\"AND\\"}",
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
    http.post.mockResolvedValueOnce(resolvedValue);

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
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"search_fields\\":\\"[\\\\\\"name\\\\\\",\\\\\\"tags\\\\\\"]\\",\\"search\\":\\"baz\\",\\"filter\\":\\"alert.attributes.alertTypeId:(foo or bar) and (alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:type })\\",\\"default_search_operator\\":\\"AND\\"}",
        },
      ]
    `);
  });

  test('should call aggregate API with ruleStatusesFilter', async () => {
    const resolvedValue = {
      rule_execution_status: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };
    http.post.mockResolvedValue(resolvedValue);

    let result = await loadRuleAggregations({
      http,
      ruleStatusesFilter: ['enabled'],
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

    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"filter\\":\\"alert.attributes.enabled: true\\",\\"default_search_operator\\":\\"AND\\"}",
        },
      ]
    `);

    result = await loadRuleAggregations({
      http,
      ruleStatusesFilter: ['enabled', 'snoozed'],
    });

    expect(http.post.mock.calls[1]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"filter\\":\\"alert.attributes.enabled: true and (alert.attributes.muteAll:true OR alert.attributes.snoozeSchedule: { duration > 0 })\\",\\"default_search_operator\\":\\"AND\\"}",
        },
      ]
    `);

    result = await loadRuleAggregations({
      http,
      ruleStatusesFilter: ['enabled', 'disabled', 'snoozed'],
    });

    expect(http.post.mock.calls[1]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"filter\\":\\"alert.attributes.enabled: true and (alert.attributes.muteAll:true OR alert.attributes.snoozeSchedule: { duration > 0 })\\",\\"default_search_operator\\":\\"AND\\"}",
        },
      ]
    `);
  });

  test('should call aggregate API with tagsFilter', async () => {
    const resolvedValue = {
      rule_execution_status: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRuleAggregations({
      http,
      searchText: 'baz',
      tagsFilter: ['a', 'b', 'c'],
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

    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"search_fields\\":\\"[\\\\\\"name\\\\\\",\\\\\\"tags\\\\\\"]\\",\\"search\\":\\"baz\\",\\"filter\\":\\"alert.attributes.tags:(a or b or c)\\",\\"default_search_operator\\":\\"AND\\"}",
        },
      ]
    `);
  });

  test('loadRuleTags should call the aggregate API with no filters', async () => {
    const resolvedValue = {
      rule_tags: ['a', 'b', 'c'],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadRuleTags({
      http,
    });

    expect(result).toEqual({
      ruleTags: ['a', 'b', 'c'],
    });

    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
      ]
    `);
  });
});
