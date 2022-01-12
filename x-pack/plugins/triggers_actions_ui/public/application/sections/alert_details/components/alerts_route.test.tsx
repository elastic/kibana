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
import { AlertsRoute, getAlertSummary } from './alerts_route';
import { Rule, AlertSummary, RuleType } from '../../../../types';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
jest.mock('../../../../common/lib/kibana');

const fakeNow = new Date('2020-02-09T23:15:41.941Z');
const fake2MinutesAgo = new Date('2020-02-09T23:13:41.941Z');

describe('alerts_summary_route', () => {
  it('render a loader while fetching data', () => {
    const rule = mockRule();
    const ruleType = mockRuleType();

    expect(
      shallow(
        <AlertsRoute readOnly={false} rule={rule} ruleType={ruleType} {...mockApis()} />
      ).containsMatchingElement(<CenterJustifiedSpinner />)
    ).toBeTruthy();
  });
});

describe('getAlertState useEffect handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches alert summary', async () => {
    const rule = mockRule();
    const alertSummary = mockAlertSummary();
    const { loadAlertSummary } = mockApis();
    const { setAlertSummary } = mockStateSetter();

    loadAlertSummary.mockImplementationOnce(async () => alertSummary);

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;

    await getAlertSummary(rule.id, loadAlertSummary, setAlertSummary, toastNotifications);

    expect(loadAlertSummary).toHaveBeenCalledWith(rule.id);
    expect(setAlertSummary).toHaveBeenCalledWith(alertSummary);
  });

  it('displays an error if the alert summary isnt found', async () => {
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

    const { loadAlertSummary } = mockApis();
    const { setAlertSummary } = mockStateSetter();

    loadAlertSummary.mockImplementation(async () => {
      throw new Error('OMG');
    });

    const toastNotifications = {
      addDanger: jest.fn(),
    } as unknown as ToastsApi;
    await getAlertSummary(rule.id, loadAlertSummary, setAlertSummary, toastNotifications);
    expect(toastNotifications.addDanger).toHaveBeenCalledTimes(1);
    expect(toastNotifications.addDanger).toHaveBeenCalledWith({
      title: 'Unable to load alerts: OMG',
    });
  });
});

function mockApis() {
  return {
    loadAlertSummary: jest.fn(),
    requestRefresh: jest.fn(),
  };
}

function mockStateSetter() {
  return {
    setAlertSummary: jest.fn(),
  };
}

function mockRule(overloads: Partial<Rule> = {}): Rule {
  return {
    id: uuid.v4(),
    enabled: true,
    name: `rule-${uuid.v4()}`,
    tags: [],
    alertTypeId: '.noop',
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
    producer: 'alerts',
    minimumLicenseRequired: 'basic',
    enabledInLicense: true,
    ...overloads,
  };
}

function mockAlertSummary(overloads: Partial<any> = {}): any {
  const summary: AlertSummary = {
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
