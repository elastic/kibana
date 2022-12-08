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
import { mockAlertSummaryTimeRange, mockRule } from '../../../../mock/alert_summary_widget';

jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn().mockImplementation(() => true),
}));

jest.mock('../../../../hooks/use_load_rule_types', () => ({
  useLoadRuleTypes: jest.fn(),
}));

jest.mock('../../../../hooks/use_load_rule_alerts_aggregations', () => ({
  useLoadRuleAlertsAggs: jest.fn().mockReturnValue({
    ruleAlertsAggs: { active: 1, recovered: 7 },
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
  const mockedTimeRange = {
    ...mockAlertSummaryTimeRange,
    title: <h3 data-test-subj="mockedTimeRangeTitle">mockedTimeRangeTitle</h3>,
  };

  async function setup() {
    const mockedRule = mockRule();

    useLoadRuleTypes.mockReturnValue({ ruleTypes });

    wrapper = mount(
      <IntlProvider locale="en">
        <RuleAlertsSummary
          rule={mockedRule}
          filteredRuleTypes={['apm', 'uptime', 'metric', 'logs']}
          onClick={jest.fn}
          timeRange={mockedTimeRange}
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
    expect(wrapper.find('[data-test-subj="mockedTimeRangeTitle"]').text()).toBe(
      'mockedTimeRangeTitle'
    );
  });
});
