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
import { Rule } from '../../../../../types';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn().mockImplementation(() => true),
}));

describe('Rule Alert Summary', () => {
  let wrapper: ReactWrapper;

  async function setup() {
    const mockedRule = mockRule();
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
});

function mockRule(): Rule {
  return {
    id: '1',
    name: 'test rule',
    tags: ['tag1'],
    enabled: true,
    ruleTypeId: 'test_rule_type',
    schedule: { interval: '1s' },
    actions: [],
    params: { name: 'test rule type name' },
    createdBy: null,
    updatedBy: null,
    apiKeyOwner: null,
    throttle: '1m',
    muteAll: false,
    mutedInstanceIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    consumer: 'alerts',
    notifyWhen: 'onActiveAlert',
    executionStatus: {
      status: 'active',
      lastDuration: 500,
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    monitoring: {
      execution: {
        history: [
          {
            success: true,
            duration: 1000000,
            timestamp: 1234567,
          },
          {
            success: true,
            duration: 200000,
            timestamp: 1234567,
          },
          {
            success: false,
            duration: 300000,
            timestamp: 1234567,
          },
        ],
        calculated_metrics: {
          success_ratio: 0.66,
          p50: 200000,
          p95: 300000,
          p99: 300000,
        },
      },
    },
  };
}
