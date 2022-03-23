/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { ToastsApi } from 'kibana/public';
import { RuleRoute, getRuleSummary } from './rule_route';
import { Rule, RuleSummary, RuleType } from '../../../../types';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
jest.mock('../../../../common/lib/kibana');

const fakeNow = new Date('2020-02-09T23:15:41.941Z');
const fake2MinutesAgo = new Date('2020-02-09T23:13:41.941Z');

describe('rules_summary_route', () => {
  it('render a loader while fetching data', () => {
    const rule = mockRule();
    const ruleType = mockRuleType();

    expect(
      shallow(
        <RuleRoute readOnly={false} rule={rule} ruleType={ruleType} {...mockApis()} />
      ).containsMatchingElement(<CenterJustifiedSpinner />)
    ).toBeTruthy();
  });
});

describe('getRuleState useEffect handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches rule summary', async () => {
    const rule = mockRule();
    const ruleSummary = mockRuleSummary();
    const { loadRuleSummary } = mockApis();
    const { setRuleSummary } = mockStateSetter();

    loadRuleSummary.mockImplementationOnce(async () => ruleSummary);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;

    await getRuleSummary(rule.id, loadRuleSummary, setRuleSummary, toastNotifications);

    expect(loadRuleSummary).toHaveBeenCalledWith(rule.id, undefined);
    expect(setRuleSummary).toHaveBeenCalledWith(ruleSummary);
  });

  it('displays an error if the rule summary isnt found', async () => {
    const connectorType = {
      id: '.server-log',
      name: 'Server log',
      enabled: true,
    };
    const rule = mockRule({
      actions: [
        {
          group: '',
          id: uuid.v4(),
          actionTypeId: connectorType.id,
          params: {},
        },
      ],
    });

    const { loadRuleSummary } = mockApis();
    const { setRuleSummary } = mockStateSetter();

    loadRuleSummary.mockImplementation(async () => {
      throw new Error('OMG');
    });

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getRuleSummary(rule.id, loadRuleSummary, setRuleSummary, toastNotifications);
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: 'Unable to load rules: OMG',
    });
  });
});

function mockApis() {
  return {
    loadRuleSummary: jest.fn(),
    requestRefresh: jest.fn(),
  };
}

function mockStateSetter() {
  return {
    setRuleSummary: jest.fn(),
  };
}

function mockRule(overloads: Partial<Rule> = {}): Rule {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `rule-${uuid.v4()}`,
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

function mockRuleType(overloads: Partial<RuleType> = {}): RuleType {
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

function mockRuleSummary(overloads: Partial<any> = {}): any {
  const summary: RuleSummary = {
    id: 'rule-id',
    name: 'rule-name',
    tags: ['tag-1', 'tag-2'],
    ruleTypeId: 'rule-type-id',
    consumer: 'rule-consumer',
    status: 'OK',
    muteAll: false,
    throttle: null,
    enabled: true,
    errorMessages: [],
    statusStartDate: fake2MinutesAgo.toISOString(),
    statusEndDate: fakeNow.toISOString(),
    alerts: {
      foo: {
        status: 'OK',
        muted: false,
      },
    },
    executionDuration: {
      average: 0,
      valuesWithTimestamp: {},
    },
  };
  return summary;
}
