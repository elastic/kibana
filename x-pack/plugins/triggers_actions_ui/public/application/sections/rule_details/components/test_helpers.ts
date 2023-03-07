/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { Rule, RuleSummary, RuleType } from '../../../../types';

export const getMockLogResponse = () => {
  return {
    id: uuidv4(),
    timestamp: '2022-03-20T07:40:44-07:00',
    duration: 5000000,
    status: 'success',
    message: 'rule execution #1',
    version: '8.2.0',
    num_active_alerts: 2,
    num_new_alerts: 4,
    num_recovered_alerts: 3,
    num_triggered_actions: 10,
    num_succeeded_actions: 0,
    num_errored_actions: 4,
    total_search_duration: 1000000,
    es_search_duration: 1400000,
    schedule_delay: 2000000,
    timed_out: false,
  };
};

export const mockLogResponse: any = {
  data: [getMockLogResponse(), getMockLogResponse(), getMockLogResponse(), getMockLogResponse()],
  total: 4,
};

export function mockRule(overloads: Partial<Rule> = {}): Rule {
  return {
    id: uuidv4(),
    enabled: true,
    name: `rule-${uuidv4()}`,
    tags: [],
    ruleTypeId: '.noop',
    consumer: 'consumer',
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiKeyOwner: null,
    throttle: null,
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    ...overloads,
  };
}

export function mockRuleType(overloads: Partial<RuleType> = {}): RuleType {
  return {
    id: 'test.testRuleType',
    name: 'My Test Rule Type',
    actionGroups: [{ id: 'default', name: 'Default Action Group' }],
    actionVariables: {
      context: [],
      state: [],
      params: [],
    },
    defaultActionGroupId: 'default',
    recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
    authorizedConsumers: {},
    producer: 'rules',
    minimumLicenseRequired: 'basic',
    enabledInLicense: true,
    ...overloads,
  };
}

export function mockRuleSummary(overloads: Partial<RuleSummary> = {}): RuleSummary {
  const summary: RuleSummary = {
    id: 'rule-id',
    name: 'rule-name',
    tags: ['tag-1', 'tag-2'],
    ruleTypeId: '123',
    consumer: 'rule-consumer',
    status: 'OK',
    muteAll: false,
    throttle: '',
    enabled: true,
    errorMessages: [],
    statusStartDate: '2022-03-21T07:40:46-07:00',
    statusEndDate: '2022-03-25T07:40:46-07:00',
    alerts: {
      foo: {
        status: 'OK',
        muted: false,
        actionGroupId: 'testActionGroup',
        flapping: false,
      },
    },
    executionDuration: {
      average: 100,
      valuesWithTimestamp: {},
    },
  };
  return { ...summary, ...overloads };
}
