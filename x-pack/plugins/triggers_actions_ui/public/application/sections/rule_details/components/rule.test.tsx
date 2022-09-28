/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { shallow } from 'enzyme';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { RuleComponent, alertToListItem } from './rule';
import { AlertListItem } from './types';
import { RuleAlertList } from './rule_alert_list';
import { RuleSummary, AlertStatus, RuleType, RuleTypeModel } from '../../../../types';
import { mockRule } from './test_helpers';
import { ruleTypeRegistryMock } from '../../../rule_type_registry.mock';
import { useKibana } from '../../../../common/lib/kibana';

jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));

const ruleTypeR: RuleTypeModel = {
  id: 'my-rule-type',
  iconClass: 'test',
  description: 'Rule when testing',
  documentationUrl: 'https://localhost.local/docs',
  validate: () => {
    return { errors: {} };
  },
  ruleParamsExpression: jest.fn(),
  requiresAppContext: false,
};

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const ruleTypeRegistry = ruleTypeRegistryMock.create();

import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';

const fakeNow = new Date('2020-02-09T23:15:41.941Z');
const fake2MinutesAgo = new Date('2020-02-09T23:13:41.941Z');

const mockAPIs = {
  muteAlertInstance: jest.fn(),
  unmuteAlertInstance: jest.fn(),
  requestRefresh: jest.fn(),
  numberOfExecutions: 60,
  onChangeDuration: jest.fn(),
};

beforeAll(() => {
  jest.clearAllMocks();
  ruleTypeRegistry.get.mockReturnValue(ruleTypeR);
  useKibanaMock().services.ruleTypeRegistry = ruleTypeRegistry;
  global.Date.now = jest.fn(() => fakeNow.getTime());
});

beforeEach(() => {
  (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
});

describe('rules', () => {
  it('render a list of rules', async () => {
    const rule = mockRule();
    const ruleType = mockRuleType();
    const ruleSummary = mockRuleSummary({
      alerts: {
        first_rule: {
          status: 'OK',
          muted: false,
          actionGroupId: 'default',
        },
        second_rule: {
          status: 'Active',
          muted: false,
          actionGroupId: 'action group id unknown',
        },
      },
    });

    const rules: AlertListItem[] = [
      // active first
      alertToListItem(fakeNow.getTime(), ruleType, 'second_rule', ruleSummary.alerts.second_rule),
      // ok second
      alertToListItem(fakeNow.getTime(), ruleType, 'first_rule', ruleSummary.alerts.first_rule),
    ];

    const wrapper = mountWithIntl(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        readOnly={false}
      />
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve));
      wrapper.update();
    });

    expect(wrapper.find(RuleAlertList).prop('items')).toEqual(rules);
  });

  it('render a hidden field with duration epoch', () => {
    const rule = mockRule();
    const ruleType = mockRuleType();
    const ruleSummary = mockRuleSummary();

    expect(
      shallow(
        <RuleComponent
          durationEpoch={fake2MinutesAgo.getTime()}
          {...mockAPIs}
          rule={rule}
          ruleType={ruleType}
          readOnly={false}
          ruleSummary={ruleSummary}
        />
      )
        .find('[name="alertsDurationEpoch"]')
        .prop('value')
    ).toEqual(fake2MinutesAgo.getTime());
  });

  it('render all active rules', async () => {
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

    const wrapper = mountWithIntl(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        readOnly={false}
        ruleSummary={mockRuleSummary({
          alerts,
        })}
      />
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve));
      wrapper.update();
    });

    expect(wrapper.find(RuleAlertList).prop('items')).toEqual([
      alertToListItem(fakeNow.getTime(), ruleType, 'us-central', alerts['us-central']),
      alertToListItem(fakeNow.getTime(), ruleType, 'us-east', alerts['us-east']),
    ]);
  });

  it('render all inactive rules', async () => {
    const rule = mockRule({
      mutedInstanceIds: ['us-west', 'us-east'],
    });
    const ruleType = mockRuleType();
    const ruleUsWest: AlertStatus = { status: 'OK', muted: false };
    const ruleUsEast: AlertStatus = { status: 'OK', muted: false };

    const wrapper = mountWithIntl(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        readOnly={false}
        ruleSummary={mockRuleSummary({
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
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve));
      wrapper.update();
    });

    expect(wrapper.find(RuleAlertList).prop('items')).toEqual([
      alertToListItem(fakeNow.getTime(), ruleType, 'us-west', ruleUsWest),
      alertToListItem(fakeNow.getTime(), ruleType, 'us-east', ruleUsEast),
    ]);
  });
});

describe('alertToListItem', () => {
  it('handles active rules', () => {
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

  it('handles active rules with no action group id', () => {
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

  it('handles active muted rules', () => {
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

  it('handles active rules with start date', () => {
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

  it('handles muted inactive rules', () => {
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
    const ruleSummary = mockRuleSummary();

    const wrapper = mountWithIntl(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        readOnly={false}
        ruleSummary={ruleSummary}
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
});

describe('disable/enable functionality', () => {
  it('should show that the rule is enabled', () => {
    const rule = mockRule();
    const ruleType = mockRuleType();
    const ruleSummary = mockRuleSummary();
    const wrapper = mountWithIntl(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        readOnly={false}
      />
    );
    const actionsElem = wrapper.find('[data-test-subj="statusDropdown"]').first();

    expect(actionsElem.text()).toEqual('Enabled');
  });

  it('should show that the rule is disabled', async () => {
    const rule = mockRule({
      enabled: false,
    });
    const ruleType = mockRuleType();
    const ruleSummary = mockRuleSummary();
    const wrapper = mountWithIntl(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        readOnly={false}
      />
    );
    const actionsElem = wrapper.find('[data-test-subj="statusDropdown"]').first();

    expect(actionsElem.text()).toEqual('Disabled');
  });
});

describe('tabbed content', () => {
  it('tabbed content renders when the event log experiment is on', async () => {
    // Enable the event log experiment
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);

    const rule = mockRule();
    const ruleType = mockRuleType();
    const ruleSummary = mockRuleSummary({
      alerts: {
        first_rule: {
          status: 'OK',
          muted: false,
          actionGroupId: 'default',
        },
        second_rule: {
          status: 'Active',
          muted: false,
          actionGroupId: 'action group id unknown',
        },
      },
    });

    const wrapper = shallow(
      <RuleComponent
        {...mockAPIs}
        rule={rule}
        ruleType={ruleType}
        ruleSummary={ruleSummary}
        readOnly={false}
      />
    );

    const tabbedContent = wrapper.find('[data-test-subj="ruleDetailsTabbedContent"]').dive();

    // Need to mock this function
    (tabbedContent.instance() as any).focusTab = jest.fn();
    tabbedContent.update();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve));
      tabbedContent.update();
    });

    expect(tabbedContent.find('[aria-labelledby="rule_event_log_list"]').exists()).toBeFalsy();
    expect(tabbedContent.find('[aria-labelledby="rule_alert_list"]').exists()).toBeTruthy();

    tabbedContent.find('[data-test-subj="eventLogListTab"]').simulate('click');

    expect(tabbedContent.find('[aria-labelledby="rule_event_log_list"]').exists()).toBeTruthy();
    expect(tabbedContent.find('[aria-labelledby="rule_alert_list"]').exists()).toBeFalsy();

    tabbedContent.find('[data-test-subj="ruleAlertListTab"]').simulate('click');

    expect(tabbedContent.find('[aria-labelledby="rule_event_log_list"]').exists()).toBeFalsy();
    expect(tabbedContent.find('[aria-labelledby="rule_alert_list"]').exists()).toBeTruthy();
  });
});

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

function mockRuleSummary(overloads: Partial<RuleSummary> = {}): RuleSummary {
  const summary: RuleSummary = {
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
