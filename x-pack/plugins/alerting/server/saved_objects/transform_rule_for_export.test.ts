/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRulesForExport } from './transform_rule_for_export';
jest.mock('../lib/rule_execution_status', () => ({
  getRuleExecutionStatusPending: () => ({
    status: 'pending',
    lastExecutionDate: '2020-08-20T19:23:38Z',
    error: null,
  }),
}));
describe('transform rule for export', () => {
  const date = new Date().toISOString();
  const mockRules = [
    {
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        name: 'rule-name',
        tags: ['tag-1', 'tag-2'],
        alertTypeId: '123',
        consumer: 'alert-consumer',
        schedule: { interval: '1m' },
        actions: [],
        params: {},
        createdBy: 'me',
        updatedBy: 'me',
        createdAt: date,
        updatedAt: date,
        apiKey: '4tndskbuhewotw4klrhgjewrt9u',
        apiKeyOwner: 'me',
        throttle: null,
        legacyId: '1',
        notifyWhen: 'onActionGroupChange',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'active',
          lastExecutionDate: '2020-08-20T19:23:38Z',
          error: null,
        },
        scheduledTaskId: '2q5tjbf3q45twer',
      },
      references: [],
    },
    {
      id: '2',
      type: 'alert',
      attributes: {
        enabled: false,
        name: 'disabled-rule',
        tags: ['tag-1'],
        alertTypeId: '456',
        consumer: 'alert-consumer',
        schedule: { interval: '1h' },
        actions: [],
        params: {},
        createdBy: 'you',
        updatedBy: 'you',
        createdAt: date,
        updatedAt: date,
        apiKey: null,
        apiKeyOwner: null,
        throttle: null,
        legacyId: '2',
        notifyWhen: 'onActionGroupChange',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'pending',
          lastExecutionDate: '2020-08-20T19:23:38Z',
          error: null,
        },
        scheduledTaskId: null,
      },
      references: [],
    },
  ];

  it('should disable rule and clear sensitive values', () => {
    expect(transformRulesForExport(mockRules)).toEqual(
      mockRules.map((rule) => ({
        ...rule,
        attributes: {
          ...rule.attributes,
          enabled: false,
          apiKey: null,
          apiKeyOwner: null,
          scheduledTaskId: null,
          legacyId: null,
          executionStatus: {
            status: 'pending',
            lastExecutionDate: '2020-08-20T19:23:38Z',
            error: null,
          },
        },
      }))
    );
  });
});
