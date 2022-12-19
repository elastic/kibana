/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';
import { nextTick } from '@kbn/test-jest-helpers';
import { AlertSummaryWidget } from './alert_summary_widget';
import { mount, ReactWrapper } from 'enzyme';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { mockAlertSummaryTimeRange } from '../../../../mock/alert_summary_widget';

jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn().mockImplementation(() => true),
}));

jest.mock('../../../../hooks/use_load_alert_summary', () => ({
  useLoadAlertSummary: jest.fn().mockReturnValue({
    alertSummary: { active: 1, recovered: 7 },
  }),
}));

describe('Rule Alert Summary', () => {
  let wrapper: ReactWrapper;
  const mockedTimeRange = {
    ...mockAlertSummaryTimeRange,
    title: <h3 data-test-subj="mockedTimeRangeTitle">mockedTimeRangeTitle</h3>,
  };

  async function setup() {
    wrapper = mount(
      <IntlProvider locale="en">
        <AlertSummaryWidget
          featureIds={['apm', 'uptime', 'logs']}
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
    expect(wrapper.find('[data-test-subj="alertSummaryWidget"]')).toBeTruthy();
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
