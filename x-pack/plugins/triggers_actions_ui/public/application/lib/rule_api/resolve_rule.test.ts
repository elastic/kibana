/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { resolveRule } from './resolve_rule';
import uuid from 'uuid';

const http = httpServiceMock.createStartContract();

describe('resolveRule', () => {
  test('should call get API with base parameters', async () => {
    const ruleId = `${uuid.v4()}/`;
    const ruleIdEncoded = encodeURIComponent(ruleId);
    const resolvedValue = {
      id: '1/',
      params: {
        aggType: 'count',
        termSize: 5,
        thresholdComparator: '>',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        groupBy: 'all',
        threshold: [1000],
        index: ['.kibana'],
        timeField: 'canvas-element.@created',
      },
      consumer: 'alerts',
      schedule: { interval: '1m' },
      tags: ['sdfsdf'],
      name: 'dfsdfdsf',
      enabled: true,
      throttle: '1h',
      rule_type_id: '.index-threshold',
      created_by: 'elastic',
      updated_by: 'elastic',
      created_at: '2021-04-01T20:29:18.652Z',
      updated_at: '2021-04-01T20:33:38.260Z',
      api_key_owner: 'elastic',
      notify_when: 'onThrottleInterval',
      mute_all: false,
      muted_alert_ids: [],
      scheduled_task_id: '1',
      execution_status: { status: 'ok', last_execution_date: '2021-04-01T21:16:46.709Z' },
      actions: [
        {
          group: 'threshold met',
          id: '1',
          params: { documents: [{ dsfsdf: 1212 }] },
          connector_type_id: '.index',
        },
      ],
      outcome: 'aliasMatch',
      alias_target_id: '2',
      alias_purpose: 'savedObjectConversion',
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    expect(await resolveRule({ http, ruleId })).toEqual({
      id: '1/',
      params: {
        aggType: 'count',
        termSize: 5,
        thresholdComparator: '>',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        groupBy: 'all',
        threshold: [1000],
        index: ['.kibana'],
        timeField: 'canvas-element.@created',
      },
      consumer: 'alerts',
      schedule: { interval: '1m' },
      tags: ['sdfsdf'],
      name: 'dfsdfdsf',
      enabled: true,
      throttle: '1h',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: '2021-04-01T20:29:18.652Z',
      updatedAt: '2021-04-01T20:33:38.260Z',
      apiKeyOwner: 'elastic',
      notifyWhen: 'onThrottleInterval',
      muteAll: false,
      mutedInstanceIds: [],
      ruleTypeId: '.index-threshold',
      scheduledTaskId: '1',
      executionStatus: { status: 'ok', lastExecutionDate: '2021-04-01T21:16:46.709Z' },
      actions: [
        {
          group: 'threshold met',
          id: '1',
          params: { documents: [{ dsfsdf: 1212 }] },
          actionTypeId: '.index',
        },
      ],
      outcome: 'aliasMatch',
      alias_target_id: '2',
      alias_purpose: 'savedObjectConversion',
    });
    expect(http.get).toHaveBeenCalledWith(`/internal/alerting/rule/${ruleIdEncoded}/_resolve`);
  });
});
