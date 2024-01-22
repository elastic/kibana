/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getCreateConversationSchemaMock = (ruleId = 'rule-1'): QueryRuleCreateProps => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
});

export const getUpdateConversationSchemaMock = (ruleId = 'rule-1'): QueryRuleCreateProps => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
});

export const getConversationMock = <T extends RuleParams>(params: T): SanitizedRule<T> => ({
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  name: 'Detect Root/Admin Users',
  tags: [],
  alertTypeId: ruleTypeMappings[params.type],
  consumer: 'siem',
  params,
  createdAt: new Date('2019-12-13T16:40:33.400Z'),
  updatedAt: new Date('2019-12-13T16:40:33.400Z'),
  schedule: { interval: '5m' },
  enabled: true,
  actions: [],
  throttle: null,
  notifyWhen: null,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  apiKeyOwner: 'elastic',
  muteAll: false,
  mutedInstanceIds: [],
  scheduledTaskId: '2dabe330-0702-11ea-8b50-773b89126888',
  executionStatus: {
    status: 'unknown',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
  revision: 0,
});

export const getQueryConversationParams = (): QueryRuleParams => {
  return {
    ...getBaseRuleParams(),
    type: 'query',
    language: 'kuery',
    query: 'user.name: root or user.name: admin',
    index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
    dataViewId: undefined,
    filters: [
      {
        query: {
          match_phrase: {
            'host.name': 'some-host',
          },
        },
      },
    ],
    savedId: undefined,
    alertSuppression: undefined,
    responseActions: undefined,
  };
};

export const getPerformBulkActionSchemaMock = (): PerformBulkActionRequestBody => ({
  query: '',
  ids: undefined,
  action: BulkActionTypeEnum.disable,
});
