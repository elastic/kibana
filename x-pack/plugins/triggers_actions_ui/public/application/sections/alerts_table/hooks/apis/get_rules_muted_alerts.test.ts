/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '@kbn/core/public/mocks';
import { getMutedAlerts } from './get_rules_muted_alerts';

const http = httpServiceMock.createStartContract();

describe('getMutedAlerts', () => {
  const apiRes = {
    page: 1,
    per_page: 10,
    total: 0,
    data: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    http.post.mockResolvedValueOnce(apiRes);
  });

  test('should call find API with correct params', async () => {
    const result = await getMutedAlerts(http, { ruleIds: ['foo'] });

    expect(result).toEqual({
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    });

    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.id\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert:foo\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}\\",\\"fields\\":[\\"id\\",\\"mutedInstanceIds\\"],\\"page\\":1,\\"per_page\\":1}",
          "signal": undefined,
        },
      ]
    `);
  });

  test('should call find API with multiple ruleIds', async () => {
    const result = await getMutedAlerts(http, { ruleIds: ['foo', 'bar'] });

    expect(result).toEqual({
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    });

    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rules/_find",
        Object {
          "body": "{\\"filter\\":\\"{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"or\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.id\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert:foo\\\\\\",\\\\\\"isQuoted\\\\\\":false}]},{\\\\\\"type\\\\\\":\\\\\\"function\\\\\\",\\\\\\"function\\\\\\":\\\\\\"is\\\\\\",\\\\\\"arguments\\\\\\":[{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert.id\\\\\\",\\\\\\"isQuoted\\\\\\":false},{\\\\\\"type\\\\\\":\\\\\\"literal\\\\\\",\\\\\\"value\\\\\\":\\\\\\"alert:bar\\\\\\",\\\\\\"isQuoted\\\\\\":false}]}]}\\",\\"fields\\":[\\"id\\",\\"mutedInstanceIds\\"],\\"page\\":1,\\"per_page\\":2}",
          "signal": undefined,
        },
      ]
    `);
  });
});
