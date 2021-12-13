/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import uuid from 'uuid';
import { shallow } from 'enzyme';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { act } from 'react-dom/test-utils';
import { Alerts, AlertListItem, alertToListItem } from './alerts';
import { Rule, AlertSummary, AlertStatus, RuleType } from '../../../../types';
import { EuiBasicTable } from '@elastic/eui';
import { ExecutionDurationChart } from '../../common/components/execution_duration_chart';

jest.mock('../../../../common/lib/kibana');

const fakeNow = new Date('2020-02-09T23:15:41.941Z');
const fake2MinutesAgo = new Date('2020-02-09T23:13:41.941Z');

const mockAPIs = {
  muteAlertInstance: jest.fn(),
  unmuteAlertInstance: jest.fn(),
  requestRefresh: jest.fn(),
};

beforeAll(() => {
  jest.resetAllMocks();
  global.Date.now = jest.fn(() => fakeNow.getTime());
});

describe('alerts', () => {
  it('render a list of alerts', () => {
    const rule = mockRule();
    const ruleType = mockRuleType();
    const alertSummary = mockAlertSummary({
      alerts: {
        first_alert: {
          status: 'OK',
          muted: false,
          actionGroupId: 'default',
        },
        second_alert: {
          status: 'Active',
          muted: false,
          actionGroupId: 'action group id unknown',
        },
      },
    });

    const alerts: AlertListItem[] = [
      // active first
      alertToListItem(
        fakeNow.getTime(),
        ruleType,
        'second_alert',
        alertSummary.alerts.second_alert
      ),
      // ok second
      alertToListItem(fakeNow.getTime(), ruleType, 'first_alert', alertSummary.alerts.first_alert),
    ];

    expect(
      shallow(
        <Alerts
          {...mockAPIs}
          rule={rule}
          ruleType={ruleType}
          alertSummary={alertSummary}
          readOnly={false}
        />
      )
        .find(EuiBasicTable)
        .prop('items')
    ).toEqual(alerts);
  });

  it('render a hidden field with duration epoch', () => {
    const rule = mockRule();
    const ruleType = mockRuleType();
    const alertSummary = mockAlertSummary();

    expect(
      shallow(
        <Alerts
          durationEpoch={fake2MinutesAgo.getTime()}
          {...mockAPIs}
          rule={rule}
          ruleType={ruleType}
          readOnly={false}
          alertSummary={alertSummary}
        />
      )
        .find('[name="alertsDurationEpoch"]')
        .prop('value')
    ).toEqual(fake2MinutesAgo.getTime());
  });

  it('render all active alerts', () => {
    const rule = mockRule();
    const ruleType = mockRuleType();
    const alerts: Record<string, AlertStatus> = {
      ['us-central']: {
        status: 'OK',
        muted: false,
      },
      ['us-east']: {
        status: 'OK',
        muted: false,
      },
    };
    expect(
      shallow(
        <Alerts
          {...mockAPIs}
          rule={rule}
          ruleType={ruleType}
          readOnly={false}
          alertSummary={mockAlertSummary({
            alerts,
          })}
        />
      )
        .find(EuiBasicTable)
        .prop('items')
    ).toEqual([
      alertToListItem(fakeNow.getTime(), ruleType, 'us-central', alerts['us-central']),
      alertToListItem(fakeNow.getTime(), ruleType, 'us-east', alerts['us-east']),
    ]);
  });

  it('render all inactive alerts', () => {
    const rule = mockRule({
      mutedInstanceIds: ['us-west', 'us-east'],
    });
    const ruleType = mockRuleType();
    const alertUsWest: AlertStatus = { status: 'OK', muted: false };
    const alertUsEast: AlertStatus = { status: 'OK', muted: false };

    expect(
      shallow(
        <Alerts
          {...mockAPIs}
          rule={rule}
          ruleType={ruleType}
          readOnly={false}
          alertSummary={mockAlertSummary({
            alerts: {
              'us-west': {
                status: 'OK',
                muted: false,
              },
              'us-east': {
                status: 'OK',
                muted: false,
              },
            },
          })}
        />
      )
        .find(EuiBasicTable)
        .prop('items')
    ).toEqual([
      alertToListItem(fakeNow.getTime(), ruleType, 'us-west', alertUsWest),
      alertToListItem(fakeNow.getTime(), ruleType, 'us-east', alertUsEast),
    ]);
  });
});

describe('alertToListItem', () => {
  it('handles active alerts', () => {
    const ruleType = mockRuleType({
      actionGroups: [
        { id: 'default', name: 'Default Action Group' },
        { id: 'testing', name: 'Test Action Group' },
      ],
    });
    const start = fake2MinutesAgo;
    const alert: AlertStatus = {
      status: 'Active',
      muted: false,
      activeStartDate: fake2MinutesAgo.toISOString(),
      actionGroupId: 'testing',
    };

    expect(alertToListItem(fakeNow.getTime(), ruleType, 'id', alert)).toEqual({
      alert: 'id',
      status: { label: 'Active', actionGroup: 'Test Action Group', healthColor: 'primary' },
      start,
      sortPriority: 0,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: false,
    });
  });

  it('handles active alerts with no action group id', () => {
    const ruleType = mockRuleType();
    const start = fake2MinutesAgo;
    const alert: AlertStatus = {
      status: 'Active',
      muted: false,
      activeStartDate: fake2MinutesAgo.toISOString(),
    };

    expect(alertToListItem(fakeNow.getTime(), ruleType, 'id', alert)).toEqual({
      alert: 'id',
      status: { label: 'Active', actionGroup: 'Default Action Group', healthColor: 'primary' },
      start,
      sortPriority: 0,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: false,
    });
  });

  it('handles active muted alerts', () => {
    const ruleType = mockRuleType();
    const start = fake2MinutesAgo;
    const alert: AlertStatus = {
      status: 'Active',
      muted: true,
      activeStartDate: fake2MinutesAgo.toISOString(),
      actionGroupId: 'default',
    };

    expect(alertToListItem(fakeNow.getTime(), ruleType, 'id', alert)).toEqual({
      alert: 'id',
      status: { label: 'Active', actionGroup: 'Default Action Group', healthColor: 'primary' },
      start,
      sortPriority: 0,
      duration: fakeNow.getTime() - fake2MinutesAgo.getTime(),
      isMuted: true,
    });
  });

  it('handles active alerts with start date', () => {
    const ruleType = mockRuleType();
    const alert: AlertStatus = {
      status: 'Active',
      muted: false,
      actionGroupId: 'default',
    };

    expect(alertToListItem(fakeNow.getTime(), ruleType, 'id', alert)).toEqual({
      alert: 'id',
      status: { label: 'Active', actionGroup: 'Default Action Group', healthColor: 'primary' },
      start: undefined,
      duration: 0,
      sortPriority: 0,
      isMuted: false,
    });
  });

  it('handles muted inactive alerts', () => {
    const ruleType = mockRuleType();
    const alert: AlertStatus = {
      status: 'OK',
      muted: true,
      actionGroupId: 'default',
    };
    expect(alertToListItem(fakeNow.getTime(), ruleType, 'id', alert)).toEqual({
      alert: 'id',
      status: { label: 'Recovered', healthColor: 'subdued' },
      start: undefined,
      duration: 0,
      sortPriority: 1,
      isMuted: true,
    });
  });
});

describe('execution duration overview', () => {
  it('render last execution status', async () => {
    const rule = mockRule({
      executionStatus: { status: 'ok', lastExecutionDate: new Date('2020-08-20T19:23:38Z') },
    });
    const ruleType = mockRuleType();
    const alertSummary = mockAlertSummary();

    const wrapper = mountWithIntl(
      <Alerts
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        readOnly={false}
        alertSummary={alertSummary}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    const ruleExecutionStatusStat = wrapper.find('[data-test-subj="ruleStatus-ok"]');
    expect(ruleExecutionStatusStat.exists()).toBeTruthy();
    expect(ruleExecutionStatusStat.first().prop('description')).toEqual('Last response');
    expect(wrapper.find('EuiHealth[data-test-subj="ruleStatus-ok"]').text()).toEqual('Ok');
  });

  it('renders average execution duration', async () => {
    const rule = mockRule();
    const ruleType = mockRuleType({ ruleTaskTimeout: '10m' });
    const alertSummary = mockAlertSummary({
      executionDuration: { average: 60284, valuesWithTimestamp: {} },
    });

    const wrapper = mountWithIntl(
      <Alerts
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        readOnly={false}
        alertSummary={alertSummary}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    const avgExecutionDurationPanel = wrapper.find('[data-test-subj="avgExecutionDurationPanel"]');
    expect(avgExecutionDurationPanel.exists()).toBeTruthy();
    expect(avgExecutionDurationPanel.first().prop('color')).toEqual('subdued');
    expect(wrapper.find('EuiStat[data-test-subj="avgExecutionDurationStat"]').text()).toEqual(
      'Average duration00:01:00.284'
    );
    expect(wrapper.find('[data-test-subj="ruleDurationWarning"]').exists()).toBeFalsy();
  });

  it('renders warning when average execution duration exceeds rule timeout', async () => {
    const rule = mockRule();
    const ruleType = mockRuleType({ ruleTaskTimeout: '10m' });
    const alertSummary = mockAlertSummary({
      executionDuration: { average: 60284345, valuesWithTimestamp: {} },
    });

    const wrapper = mountWithIntl(
      <Alerts
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        readOnly={false}
        alertSummary={alertSummary}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    const avgExecutionDurationPanel = wrapper.find('[data-test-subj="avgExecutionDurationPanel"]');
    expect(avgExecutionDurationPanel.exists()).toBeTruthy();
    expect(avgExecutionDurationPanel.first().prop('color')).toEqual('warning');
    expect(wrapper.find('EuiStat[data-test-subj="avgExecutionDurationStat"]').text()).toEqual(
      'Average duration16:44:44.345'
    );
    expect(wrapper.find('[data-test-subj="ruleDurationWarning"]').exists()).toBeTruthy();
  });

  it('renders execution duration chart', () => {
    const rule = mockRule();
    const ruleType = mockRuleType();
    const alertSummary = mockAlertSummary();

    expect(
      shallow(
        <Alerts
          {...mockAPIs}
          rule={rule}
          ruleType={ruleType}
          alertSummary={alertSummary}
          readOnly={false}
        />
      )
        .find(ExecutionDurationChart)
        .exists()
    ).toBeTruthy();
  });
});

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

function mockAlertSummary(overloads: Partial<AlertSummary> = {}): AlertSummary {
  const summary: AlertSummary = {
    id: 'rule-id',
    name: 'rule-name',
    tags: ['tag-1', 'tag-2'],
    ruleTypeId: 'rule-type-id',
    consumer: 'rule-consumer',
    status: 'OK',
    muteAll: false,
    throttle: '',
    enabled: true,
    errorMessages: [],
    statusStartDate: fake2MinutesAgo.toISOString(),
    statusEndDate: fakeNow.toISOString(),
    alerts: {
      foo: {
        status: 'OK',
        muted: false,
        actionGroupId: 'testActionGroup',
      },
    },
    executionDuration: {
      average: 0,
      valuesWithTimestamp: {},
    },
  };
  return { ...summary, ...overloads };
}
