/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { loadRuleState } from './state';
import uuid from 'uuid';

const http = httpServiceMock.createStartContract();

describe('loadRuleState', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should call get API with base parameters', async () => {
    const ruleId = uuid.v4();
    const resolvedValue = {
      alertTypeState: {
        some: 'value',
      },
      alertInstances: {
        first_instance: {},
        second_instance: {},
      },
    };
    http.get.mockResolvedValueOnce({
      rule_type_state: {
        some: 'value',
      },
      alerts: {
        first_instance: {},
        second_instance: {},
      },
    });

    expect(await loadRuleState({ http, ruleId })).toEqual(resolvedValue);
    expect(http.get).toHaveBeenCalledWith(`/internal/alerting/rule/${ruleId}/state`);
  });

  test('should parse RuleInstances', async () => {
    const ruleId = uuid.v4();
    const resolvedValue = {
      alertTypeState: {
        some: 'value',
      },
      alertInstances: {
        first_instance: {
          state: {},
          meta: {
            lastScheduledActions: {
              group: 'first_group',
              date: '2020-02-09T23:15:41.941Z',
            },
          },
        },
      },
    };
    http.get.mockResolvedValueOnce({
      rule_type_state: {
        some: 'value',
      },
      alerts: {
        first_instance: {
          state: {},
          meta: {
            lastScheduledActions: {
              group: 'first_group',
              date: '2020-02-09T23:15:41.941Z',
            },
          },
        },
      },
    });

    expect(await loadRuleState({ http, ruleId })).toEqual({
      ...resolvedValue,
      alertInstances: {
        first_instance: {
          state: {},
          meta: {
            lastScheduledActions: {
              group: 'first_group',
              date: new Date('2020-02-09T23:15:41.941Z'),
            },
          },
        },
      },
    });
    expect(http.get).toHaveBeenCalledWith(`/internal/alerting/rule/${ruleId}/state`);
  });

  test('should handle empty response from api', async () => {
    const ruleId = uuid.v4();
    http.get.mockResolvedValueOnce('');

    expect(await loadRuleState({ http, ruleId })).toEqual({});
    expect(http.get).toHaveBeenCalledWith(`/internal/alerting/rule/${ruleId}/state`);
  });
});
