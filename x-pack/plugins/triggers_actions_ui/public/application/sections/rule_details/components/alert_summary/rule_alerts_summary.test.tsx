/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';
import { nextTick } from '@kbn/test-jest-helpers';
import { RuleAlertsSummary } from './rule_alerts_summary';
import { mount, ReactWrapper } from 'enzyme';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { mockRule } from '../../../../mock/rule_details/alert_summary';
import { AlertChartData } from './types';

jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn().mockImplementation(() => true),
}));

jest.mock('../../../../hooks/use_load_rule_types', () => ({
  useLoadRuleTypes: jest.fn(),
}));

jest.mock('../../../../hooks/use_load_rule_alerts_aggregations', () => ({
  useLoadRuleAlertsAggs: jest.fn().mockReturnValue({
    ruleAlertsAggs: { active: 1, recovered: 7 },
    alertsChartData: mockChartData(),
  }),
}));

const { useLoadRuleTypes } = jest.requireMock('../../../../hooks/use_load_rule_types');
const ruleTypes = [
  {
    id: 'test_rule_type',
    name: 'some rule type',
    actionGroups: [{ id: 'default', name: 'Default' }],
    recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
    actionVariables: { context: [], state: [] },
    defaultActionGroupId: 'default',
    producer: ALERTS_FEATURE_ID,
    minimumLicenseRequired: 'basic',
    enabledInLicense: true,
    authorizedConsumers: {
      [ALERTS_FEATURE_ID]: { read: true, all: false },
    },
    ruleTaskTimeout: '1m',
  },
];

describe('Rule Alert Summary', () => {
  let wrapper: ReactWrapper;

  async function setup() {
    const mockedRule = mockRule();

    useLoadRuleTypes.mockReturnValue({ ruleTypes });

    wrapper = mount(
      <IntlProvider locale="en">
        <RuleAlertsSummary
          rule={mockedRule}
          filteredRuleTypes={['apm', 'uptime', 'metric', 'logs']}
        />
      </IntlProvider>
    );
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }
  beforeAll(async () => setup());
  it('should render the Rule Alerts Summary component', async () => {
    expect(wrapper.find('[data-test-subj="ruleAlertsSummary"]')).toBeTruthy();
  });

  it('should show zeros for all alerts counters', async () => {
    expect(wrapper.find('[data-test-subj="activeAlertsCount"]').text()).toEqual('1');
    expect(wrapper.find('[data-test-subj="recoveredAlertsCount"]').text()).toBe('7');
    expect(wrapper.find('[data-test-subj="totalAlertsCount"]').text()).toBe('8');
  });
});

// This function should stay in the same file as the test otherwise the test will fail.
function mockChartData(): AlertChartData[] {
  return [
    {
      date: 1660608000000,
      count: 6,
      status: 'recovered',
    },
    {
      date: 1660694400000,
      count: 1,
      status: 'recovered',
    },
    {
      date: 1660694400000,
      count: 1,
      status: 'active',
    },
    {
      date: 1658102400000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658188800000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658275200000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658361600000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658448000000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658534400000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658620800000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658707200000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658793600000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658880000000,
      count: 6,
      status: 'total',
    },
    {
      date: 1658966400000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659052800000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659139200000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659225600000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659312000000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659398400000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659484800000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659571200000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659657600000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659744000000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659830400000,
      count: 6,
      status: 'total',
    },
    {
      date: 1659916800000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660003200000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660089600000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660176000000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660262400000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660348800000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660435200000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660521600000,
      count: 6,
      status: 'total',
    },
    {
      date: 1660694400000,
      count: 4,
      status: 'total',
    },
  ];
}
