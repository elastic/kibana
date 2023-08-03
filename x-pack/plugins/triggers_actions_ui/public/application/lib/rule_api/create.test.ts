/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleActionTypes } from '@kbn/alerting-plugin/common';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { RuleUpdates } from '../../../types';
import { createRule } from './create';

const http = httpServiceMock.createStartContract();

describe('createRule', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should call create alert API', async () => {
    const resolvedValue = {
      params: {
        aggType: 'count',
        termSize: 5,
        thresholdComparator: '>',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        groupBy: 'all',
        threshold: [1000],
        index: ['.kibana'],
        timeField: 'alert.executionStatus.lastExecutionDate',
      },
      consumer: 'alerts',
      schedule: { interval: '1m' },
      tags: [],
      name: 'test',
      rule_type_id: '.index-threshold',
      actions: [
        {
          group: 'threshold met',
          id: '1',
          params: {
            level: 'info',
            message: 'alert ',
          },
          connector_type_id: '.server-log',
          frequency: {
            notify_when: 'onActionGroupChange',
            throttle: null,
            summary: false,
          },
        },
        {
          id: 'system-action',
          uuid: '123',
          connector_type_id: '.test',
          params: {},
          type: RuleActionTypes.SYSTEM,
        },
      ],
      scheduled_task_id: '1',
      execution_status: { status: 'pending', last_execution_date: '2021-04-01T21:33:13.250Z' },
      create_at: '2021-04-01T21:33:13.247Z',
      updated_at: '2021-04-01T21:33:13.247Z',
    };

    const ruleToCreate: Omit<
      RuleUpdates,
      'createdBy' | 'updatedBy' | 'muteAll' | 'mutedInstanceIds' | 'executionStatus'
    > = {
      params: {
        aggType: 'count',
        termSize: 5,
        thresholdComparator: '>',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        groupBy: 'all',
        threshold: [1000],
        index: ['.kibana'],
        timeField: 'alert.executionStatus.lastExecutionDate',
      },
      consumer: 'alerts',
      schedule: { interval: '1m' },
      tags: [],
      name: 'test',
      enabled: true,
      throttle: null,
      ruleTypeId: '.index-threshold',
      actions: [
        {
          group: 'threshold met',
          id: '83d4d860-9316-11eb-a145-93ab369a4461',
          params: {
            level: 'info',
            message:
              "Rule '{{rule.name}}' is active for group '{{context.group}}':\n\n- Value: {{context.value}}\n- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}\n- Timestamp: {{context.date}}",
          },
          actionTypeId: '.server-log',
          frequency: {
            notifyWhen: 'onActionGroupChange',
            throttle: null,
            summary: false,
          },
        },
        {
          id: 'system-action',
          uuid: '123',
          actionTypeId: '.test',
          params: {},
          type: RuleActionTypes.SYSTEM,
        },
      ],
      createdAt: new Date('2021-04-01T21:33:13.247Z'),
      updatedAt: new Date('2021-04-01T21:33:13.247Z'),
      apiKeyOwner: '',
      revision: 0,
    };

    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await createRule({ http, rule: ruleToCreate });

    expect(http.post).toHaveBeenCalledWith('/api/alerting/rule', {
      body: '{"params":{"aggType":"count","termSize":5,"thresholdComparator":">","timeWindowSize":5,"timeWindowUnit":"m","groupBy":"all","threshold":[1000],"index":[".kibana"],"timeField":"alert.executionStatus.lastExecutionDate"},"consumer":"alerts","schedule":{"interval":"1m"},"tags":[],"name":"test","enabled":true,"throttle":null,"createdAt":"2021-04-01T21:33:13.247Z","updatedAt":"2021-04-01T21:33:13.247Z","apiKeyOwner":"","revision":0,"rule_type_id":".index-threshold","actions":[{"group":"threshold met","id":"83d4d860-9316-11eb-a145-93ab369a4461","params":{"level":"info","message":"Rule \'{{rule.name}}\' is active for group \'{{context.group}}\':\\n\\n- Value: {{context.value}}\\n- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}\\n- Timestamp: {{context.date}}"},"frequency":{"notify_when":"onActionGroupChange","throttle":null,"summary":false},"connector_type_id":".server-log"},{"id":"system-action","uuid":"123","params":{},"type":"system","connector_type_id":".test"}]}',
    });

    expect(result).toEqual({
      actions: [
        {
          actionTypeId: '.server-log',
          group: 'threshold met',
          id: '1',
          params: {
            level: 'info',
            message: 'alert ',
          },
          frequency: {
            notifyWhen: 'onActionGroupChange',
            throttle: null,
            summary: false,
          },
        },
        {
          id: 'system-action',
          uuid: '123',
          actionTypeId: '.test',
          params: {},
          type: RuleActionTypes.SYSTEM,
        },
      ],
      ruleTypeId: '.index-threshold',
      apiKeyOwner: undefined,
      consumer: 'alerts',
      create_at: '2021-04-01T21:33:13.247Z',
      createdAt: undefined,
      createdBy: undefined,
      executionStatus: {
        lastExecutionDate: '2021-04-01T21:33:13.250Z',
        status: 'pending',
      },
      muteAll: undefined,
      mutedInstanceIds: undefined,
      name: 'test',
      params: {
        aggType: 'count',
        groupBy: 'all',
        index: ['.kibana'],
        termSize: 5,
        threshold: [1000],
        thresholdComparator: '>',
        timeField: 'alert.executionStatus.lastExecutionDate',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
      },
      schedule: {
        interval: '1m',
      },
      scheduledTaskId: '1',
      tags: [],
      updatedAt: '2021-04-01T21:33:13.247Z',
      updatedBy: undefined,
    });
  });
});
