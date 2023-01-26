/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { EuiSuperSelectProps } from '@elastic/eui';
import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';
import { act } from 'react-dom/test-utils';
import { RuleAction } from '../../../types';
import {
  DEFAULT_FREQUENCY_WITHOUT_SUMMARY,
  DEFAULT_FREQUENCY_WITH_SUMMARY,
} from '../../../common/constants';
import { ActionNotifyWhen } from './action_notify_when';

jest.mock('../../../common/lib/kibana');
jest.mock('../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
}));

describe('action_notify_when', () => {
  async function setup(
    frequency: RuleAction['frequency'] = DEFAULT_FREQUENCY_WITH_SUMMARY,
    hasSummary: boolean = true
  ) {
    const wrapper = mountWithIntl(
      <ActionNotifyWhen
        frequency={frequency}
        throttle={frequency.throttle ? Number(frequency.throttle[0]) : null}
        throttleUnit={frequency.throttle ? frequency.throttle[1] : 'm'}
        onNotifyWhenChange={jest.fn()}
        onThrottleChange={jest.fn()}
        onSummaryChange={jest.fn()}
        hasSummary={hasSummary}
      />
    );

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    return wrapper;
  }

  it('renders the passed-in frequency on load', async () => {
    const wrapperDefault = await setup();
    {
      const summaryOrPerRuleSelect = wrapperDefault.find(
        '[data-test-subj="summaryOrPerRuleSelect"]'
      );
      expect(summaryOrPerRuleSelect.exists()).toBeTruthy();
      expect(summaryOrPerRuleSelect.first().props()['aria-label']).toEqual('Summary of alerts');

      const notifyWhenSelect = wrapperDefault.find('[data-test-subj="notifyWhenSelect"]');
      expect(notifyWhenSelect.exists()).toBeTruthy();
      expect((notifyWhenSelect.first().props() as EuiSuperSelectProps<''>).valueOfSelected).toEqual(
        RuleNotifyWhen.ACTIVE
      );
    }
    const wrapperForEach = await setup(DEFAULT_FREQUENCY_WITHOUT_SUMMARY);
    {
      const summaryOrPerRuleSelect = wrapperForEach.find(
        '[data-test-subj="summaryOrPerRuleSelect"]'
      );
      expect(summaryOrPerRuleSelect.exists()).toBeTruthy();
      expect(summaryOrPerRuleSelect.first().props()['aria-label']).toEqual('For each alert');

      const notifyWhenSelect = wrapperForEach.find('[data-test-subj="notifyWhenSelect"]');
      expect(notifyWhenSelect.exists()).toBeTruthy();
      expect((notifyWhenSelect.first().props() as EuiSuperSelectProps<''>).valueOfSelected).toEqual(
        RuleNotifyWhen.CHANGE
      );
    }
    const wrapperSummaryThrottle = await setup({
      ...DEFAULT_FREQUENCY_WITH_SUMMARY,
      throttle: '5h',
      notifyWhen: RuleNotifyWhen.THROTTLE,
    });
    {
      const summaryOrPerRuleSelect = wrapperSummaryThrottle.find(
        '[data-test-subj="summaryOrPerRuleSelect"]'
      );
      expect(summaryOrPerRuleSelect.exists()).toBeTruthy();
      expect(summaryOrPerRuleSelect.first().props()['aria-label']).toEqual('Summary of alerts');

      const notifyWhenSelect = wrapperSummaryThrottle.find('[data-test-subj="notifyWhenSelect"]');
      expect(notifyWhenSelect.exists()).toBeTruthy();
      expect((notifyWhenSelect.first().props() as EuiSuperSelectProps<''>).valueOfSelected).toEqual(
        RuleNotifyWhen.THROTTLE
      );
    }
    expect(
      wrapperSummaryThrottle.find('[data-test-subj="throttleInput"]').first().props().value
    ).toEqual(5);
    expect(
      wrapperSummaryThrottle.find('[data-test-subj="throttleUnitInput"]').first().props().value
    ).toEqual('h');
  });

  it('hides the summary selector when hasSummary is false', async () => {
    const wrapper = await setup(DEFAULT_FREQUENCY_WITHOUT_SUMMARY, false);
    const summaryOrPerRuleSelect = wrapper.find('[data-test-subj="summaryOrPerRuleSelect"]');
    expect(summaryOrPerRuleSelect.exists()).toBeFalsy();
  });
});
