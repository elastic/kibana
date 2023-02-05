/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { loadRuleAggregations, loadRuleTags } from './aggregate';

const http = httpServiceMock.createStartContract();

const aggregateResult = {
  status: {
    buckets: [
      {
        key: 'ok',
        doc_count: 15,
      },
      {
        key: 'error',
        doc_count: 2,
      },
      {
        key: 'active',
        doc_count: 23,
      },
      {
        key: 'pending',
        doc_count: 1,
      },
      {
        key: 'unknown',
        doc_count: 0,
      },
      {
        key: 'warning',
        doc_count: 10,
      },
    ],
  },
  outcome: {
    buckets: [
      {
        key: 'succeeded',
        doc_count: 2,
      },
      {
        key: 'failed',
        doc_count: 4,
      },
      {
        key: 'warning',
        doc_count: 6,
      },
    ],
  },
  enabled: {
    buckets: [
      {
        key: 0,
        key_as_string: '0',
        doc_count: 2,
      },
      {
        key: 1,
        key_as_string: '1',
        doc_count: 28,
      },
    ],
  },
  muted: {
    buckets: [
      {
        key: 0,
        key_as_string: '0',
        doc_count: 27,
      },
      {
        key: 1,
        key_as_string: '1',
        doc_count: 3,
      },
    ],
  },
  snoozed: {
    doc_count: 0,
    count: {
      doc_count: 0,
    },
  },
  tags: {
    buckets: [
      {
        key: 'a',
        doc_count: 10,
      },
      {
        key: 'b',
        doc_count: 20,
      },
      {
        key: 'c',
        doc_count: 30,
      },
    ],
  },
};

const formattedAggregateResult = {
  ruleExecutionStatus: {
    ok: 15,
    error: 2,
    active: 23,
    pending: 1,
    unknown: 0,
    warning: 10,
  },
  ruleLastRunOutcome: {
    succeeded: 2,
    failed: 4,
    warning: 6,
  },
  ruleEnabledStatus: {
    enabled: 28,
    disabled: 2,
  },
  ruleMutedStatus: {
    muted: 3,
    unmuted: 27,
  },
  ruleSnoozedStatus: {
    snoozed: 0,
  },
  ruleTags: ['a', 'b', 'c'],
};

describe('loadRuleAggregations', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should call aggregate API with base parameters', async () => {
    http.post.mockResolvedValueOnce(aggregateResult);

    const result = await loadRuleAggregations({ http });

    expect(result).toEqual(formattedAggregateResult);

    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"aggs\\":\\"{\\\\\\"status\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.executionStatus.status\\\\\\"}},\\\\\\"outcome\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.lastRun.outcome\\\\\\"}},\\\\\\"enabled\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\"}},\\\\\\"muted\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.muteAll\\\\\\"}},\\\\\\"tags\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"order\\\\\\":{\\\\\\"_key\\\\\\":\\\\\\"asc\\\\\\"},\\\\\\"size\\\\\\":50}},\\\\\\"snoozed\\\\\\":{\\\\\\"nested\\\\\\":{\\\\\\"path\\\\\\":\\\\\\"alert.attributes.snoozeSchedule\\\\\\"},\\\\\\"aggs\\\\\\":{\\\\\\"count\\\\\\":{\\\\\\"filter\\\\\\":{\\\\\\"exists\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.snoozeSchedule.duration\\\\\\"}}}}}}\\",\\"default_search_operator\\":\\"AND\\"}",
        },
      ]
    `);
  });

  test('should call aggregate API with searchText', async () => {
    http.post.mockResolvedValueOnce(aggregateResult);

    const result = await loadRuleAggregations({ http, searchText: 'apples' });
    expect(result).toEqual(formattedAggregateResult);
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"aggs\\":\\"{\\\\\\"status\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.executionStatus.status\\\\\\"}},\\\\\\"outcome\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.lastRun.outcome\\\\\\"}},\\\\\\"enabled\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\"}},\\\\\\"muted\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.muteAll\\\\\\"}},\\\\\\"tags\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"order\\\\\\":{\\\\\\"_key\\\\\\":\\\\\\"asc\\\\\\"},\\\\\\"size\\\\\\":50}},\\\\\\"snoozed\\\\\\":{\\\\\\"nested\\\\\\":{\\\\\\"path\\\\\\":\\\\\\"alert.attributes.snoozeSchedule\\\\\\"},\\\\\\"aggs\\\\\\":{\\\\\\"count\\\\\\":{\\\\\\"filter\\\\\\":{\\\\\\"exists\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.snoozeSchedule.duration\\\\\\"}}}}}}\\",\\"search_fields\\":\\"[\\\\\\"name\\\\\\",\\\\\\"tags\\\\\\"]\\",\\"search\\":\\"apples\\",\\"default_search_operator\\":\\"AND\\"}",
        },
      ]
    `);
  });

  test('should call aggregate API with actionTypesFilter', async () => {
    http.post.mockResolvedValueOnce(aggregateResult);

    const result = await loadRuleAggregations({
      http,
      searchText: 'foo',
      actionTypesFilter: ['action', 'type'],
    });
    expect(result).toEqual(formattedAggregateResult);
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"aggs\\":\\"{\\\\\\"status\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.executionStatus.status\\\\\\"}},\\\\\\"outcome\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.lastRun.outcome\\\\\\"}},\\\\\\"enabled\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\"}},\\\\\\"muted\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.muteAll\\\\\\"}},\\\\\\"tags\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"order\\\\\\":{\\\\\\"_key\\\\\\":\\\\\\"asc\\\\\\"},\\\\\\"size\\\\\\":50}},\\\\\\"snoozed\\\\\\":{\\\\\\"nested\\\\\\":{\\\\\\"path\\\\\\":\\\\\\"alert.attributes.snoozeSchedule\\\\\\"},\\\\\\"aggs\\\\\\":{\\\\\\"count\\\\\\":{\\\\\\"filter\\\\\\":{\\\\\\"exists\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.snoozeSchedule.duration\\\\\\"}}}}}}\\",\\"search_fields\\":\\"[\\\\\\"name\\\\\\",\\\\\\"tags\\\\\\"]\\",\\"search\\":\\"foo\\",\\"default_search_operator\\":\\"AND\\",\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"nested\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.actions\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"actionTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"action\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"nested\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.actions\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"actionTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"type\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]}]}\\"}",
        },
      ]
    `);
  });

  test('should call aggregate API with typesFilter', async () => {
    http.post.mockResolvedValueOnce(aggregateResult);

    const result = await loadRuleAggregations({
      http,
      typesFilter: ['foo', 'bar'],
    });
    expect(result).toEqual(formattedAggregateResult);
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"aggs\\":\\"{\\\\\\"status\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.executionStatus.status\\\\\\"}},\\\\\\"outcome\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.lastRun.outcome\\\\\\"}},\\\\\\"enabled\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\"}},\\\\\\"muted\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.muteAll\\\\\\"}},\\\\\\"tags\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"order\\\\\\":{\\\\\\"_key\\\\\\":\\\\\\"asc\\\\\\"},\\\\\\"size\\\\\\":50}},\\\\\\"snoozed\\\\\\":{\\\\\\"nested\\\\\\":{\\\\\\"path\\\\\\":\\\\\\"alert.attributes.snoozeSchedule\\\\\\"},\\\\\\"aggs\\\\\\":{\\\\\\"count\\\\\\":{\\\\\\"filter\\\\\\":{\\\\\\"exists\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.snoozeSchedule.duration\\\\\\"}}}}}}\\",\\"default_search_operator\\":\\"AND\\",\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.alertTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"foo\\\\\\",\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.alertTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"bar\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]}\\"}",
        },
      ]
    `);
  });

  test('should call aggregate API with actionTypesFilter and typesFilter', async () => {
    http.post.mockResolvedValueOnce(aggregateResult);

    const result = await loadRuleAggregations({
      http,
      searchText: 'baz',
      actionTypesFilter: ['action', 'type'],
      typesFilter: ['foo', 'bar'],
    });
    expect(result).toEqual(formattedAggregateResult);
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"aggs\\":\\"{\\\\\\"status\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.executionStatus.status\\\\\\"}},\\\\\\"outcome\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.lastRun.outcome\\\\\\"}},\\\\\\"enabled\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\"}},\\\\\\"muted\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.muteAll\\\\\\"}},\\\\\\"tags\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"order\\\\\\":{\\\\\\"_key\\\\\\":\\\\\\"asc\\\\\\"},\\\\\\"size\\\\\\":50}},\\\\\\"snoozed\\\\\\":{\\\\\\"nested\\\\\\":{\\\\\\"path\\\\\\":\\\\\\"alert.attributes.snoozeSchedule\\\\\\"},\\\\\\"aggs\\\\\\":{\\\\\\"count\\\\\\":{\\\\\\"filter\\\\\\":{\\\\\\"exists\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.snoozeSchedule.duration\\\\\\"}}}}}}\\",\\"search_fields\\":\\"[\\\\\\"name\\\\\\",\\\\\\"tags\\\\\\"]\\",\\"search\\":\\"baz\\",\\"default_search_operator\\":\\"AND\\",\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"and\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.alertTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"foo\\\\\\",\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.alertTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"bar\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"nested\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.actions\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"actionTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"action\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"nested\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.actions\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"actionTypeId\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"type\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]}]}]}\\"}",
        },
      ]
    `);
  });

  test('should call aggregate API with ruleStatusesFilter', async () => {
    http.post.mockResolvedValue(aggregateResult);

    let result = await loadRuleAggregations({
      http,
      ruleStatusesFilter: ['enabled'],
    });
    expect(result).toEqual(formattedAggregateResult);
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"aggs\\":\\"{\\\\\\"status\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.executionStatus.status\\\\\\"}},\\\\\\"outcome\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.lastRun.outcome\\\\\\"}},\\\\\\"enabled\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\"}},\\\\\\"muted\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.muteAll\\\\\\"}},\\\\\\"tags\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"order\\\\\\":{\\\\\\"_key\\\\\\":\\\\\\"asc\\\\\\"},\\\\\\"size\\\\\\":50}},\\\\\\"snoozed\\\\\\":{\\\\\\"nested\\\\\\":{\\\\\\"path\\\\\\":\\\\\\"alert.attributes.snoozeSchedule\\\\\\"},\\\\\\"aggs\\\\\\":{\\\\\\"count\\\\\\":{\\\\\\"filter\\\\\\":{\\\\\\"exists\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.snoozeSchedule.duration\\\\\\"}}}}}}\\",\\"default_search_operator\\":\\"AND\\",\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":true,\\\\\\"isQuoted\\\\\\":false}]}\\"}",
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
          "body": "{\\"aggs\\":\\"{\\\\\\"status\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.executionStatus.status\\\\\\"}},\\\\\\"outcome\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.lastRun.outcome\\\\\\"}},\\\\\\"enabled\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\"}},\\\\\\"muted\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.muteAll\\\\\\"}},\\\\\\"tags\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"order\\\\\\":{\\\\\\"_key\\\\\\":\\\\\\"asc\\\\\\"},\\\\\\"size\\\\\\":50}},\\\\\\"snoozed\\\\\\":{\\\\\\"nested\\\\\\":{\\\\\\"path\\\\\\":\\\\\\"alert.attributes.snoozeSchedule\\\\\\"},\\\\\\"aggs\\\\\\":{\\\\\\"count\\\\\\":{\\\\\\"filter\\\\\\":{\\\\\\"exists\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.snoozeSchedule.duration\\\\\\"}}}}}}\\",\\"default_search_operator\\":\\"AND\\",\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":true,\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.muteAll\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":true,\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"nested\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.snoozeSchedule\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"range\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"duration\\\\\\",\\\\\\"isQuoted\\\\\\":false},\\\\\\"gt\\\\\\",{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"0\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]}]}]}\\"}",
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
          "body": "{\\"aggs\\":\\"{\\\\\\"status\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.executionStatus.status\\\\\\"}},\\\\\\"outcome\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.lastRun.outcome\\\\\\"}},\\\\\\"enabled\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\"}},\\\\\\"muted\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.muteAll\\\\\\"}},\\\\\\"tags\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"order\\\\\\":{\\\\\\"_key\\\\\\":\\\\\\"asc\\\\\\"},\\\\\\"size\\\\\\":50}},\\\\\\"snoozed\\\\\\":{\\\\\\"nested\\\\\\":{\\\\\\"path\\\\\\":\\\\\\"alert.attributes.snoozeSchedule\\\\\\"},\\\\\\"aggs\\\\\\":{\\\\\\"count\\\\\\":{\\\\\\"filter\\\\\\":{\\\\\\"exists\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.snoozeSchedule.duration\\\\\\"}}}}}}\\",\\"default_search_operator\\":\\"AND\\",\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":true,\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.muteAll\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":true,\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"nested\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.snoozeSchedule\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"range\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"duration\\\\\\",\\\\\\"isQuoted\\\\\\":false},\\\\\\"gt\\\\\\",{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"0\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]}]}]}\\"}",
        },
      ]
    `);
  });

  test('should call aggregate API with tagsFilter', async () => {
    http.post.mockResolvedValueOnce(aggregateResult);

    const result = await loadRuleAggregations({
      http,
      searchText: 'baz',
      tagsFilter: ['a', 'b', 'c'],
    });

    expect(result).toEqual(formattedAggregateResult);
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"aggs\\":\\"{\\\\\\"status\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.executionStatus.status\\\\\\"}},\\\\\\"outcome\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.lastRun.outcome\\\\\\"}},\\\\\\"enabled\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.enabled\\\\\\"}},\\\\\\"muted\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.muteAll\\\\\\"}},\\\\\\"tags\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"order\\\\\\":{\\\\\\"_key\\\\\\":\\\\\\"asc\\\\\\"},\\\\\\"size\\\\\\":50}},\\\\\\"snoozed\\\\\\":{\\\\\\"nested\\\\\\":{\\\\\\"path\\\\\\":\\\\\\"alert.attributes.snoozeSchedule\\\\\\"},\\\\\\"aggs\\\\\\":{\\\\\\"count\\\\\\":{\\\\\\"filter\\\\\\":{\\\\\\"exists\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.snoozeSchedule.duration\\\\\\"}}}}}}\\",\\"search_fields\\":\\"[\\\\\\"name\\\\\\",\\\\\\"tags\\\\\\"]\\",\\"search\\":\\"baz\\",\\"default_search_operator\\":\\"AND\\",\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"a\\\\\\",\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"b\\\\\\",\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"c\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]}\\"}",
        },
      ]
    `);
  });

  test('loadRuleTags should call the aggregate API with no filters', async () => {
    const resolvedValue = {
      tags: {
        buckets: [
          {
            key: {
              tags: 'a',
            },
            doc_count: 10,
          },
          {
            key: {
              tags: 'b',
            },
            doc_count: 20,
          },
          {
            key: {
              tags: 'c',
            },
            doc_count: 30,
          },
        ],
      },
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await loadRuleTags({
      http,
    });

    expect(result).toEqual({
      ruleTags: ['a', 'b', 'c'],
    });

    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_aggregate",
        Object {
          "body": "{\\"aggs\\":\\"{\\\\\\"tags\\\\\\":{\\\\\\"composite\\\\\\":{\\\\\\"size\\\\\\":50,\\\\\\"sources\\\\\\":[{\\\\\\"tags\\\\\\":{\\\\\\"terms\\\\\\":{\\\\\\"field\\\\\\":\\\\\\"alert.attributes.tags\\\\\\",\\\\\\"order\\\\\\":\\\\\\"asc\\\\\\"}}}]}}}\\"}",
        },
      ]
    `);
  });
});
