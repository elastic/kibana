/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { RuleSummary } from '../../../types';
import { loadRuleSummary } from './rule_summary';

const http = httpServiceMock.createStartContract();

describe('loadRuleSummary', () => {
  test('should call rule summary API', async () => {
    const resolvedValue: RuleSummary = {
      alerts: {},
      consumer: 'alerts',
      enabled: true,
      errorMessages: [],
      id: 'te/st',
      lastRun: '2021-04-01T22:18:27.609Z',
      muteAll: false,
      name: 'test',
      ruleTypeId: '.index-threshold',
      status: 'OK',
      statusEndDate: '2021-04-01T22:19:25.174Z',
      statusStartDate: '2021-04-01T21:19:25.174Z',
      tags: [],
      throttle: null,
      executionDuration: {
        average: 0,
        valuesWithTimestamp: {},
      },
    };

    http.get.mockResolvedValueOnce({
      alerts: {},
      consumer: 'alerts',
      enabled: true,
      error_messages: [],
      id: 'te/st',
      last_run: '2021-04-01T22:18:27.609Z',
      mute_all: false,
      name: 'test',
      rule_type_id: '.index-threshold',
      status: 'OK',
      status_end_date: '2021-04-01T22:19:25.174Z',
      status_start_date: '2021-04-01T21:19:25.174Z',
      tags: [],
      throttle: null,
      execution_duration: {
        average: 0,
        valuesWithTimestamp: {},
      },
    });

    const result = await loadRuleSummary({ http, ruleId: 'te/st' });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rule/te%2Fst/_alert_summary",
        Object {
          "query": Object {
            "number_of_executions": undefined,
          },
        },
      ]
    `);
  });
});
