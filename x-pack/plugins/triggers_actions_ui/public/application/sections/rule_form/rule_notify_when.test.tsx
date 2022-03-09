/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { Rule } from '../../../types';
import { ALERTS_FEATURE_ID } from '../../../../../alerting/common';
import { RuleNotifyWhen } from './rule_notify_when';

describe('rule_notify_when', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const onNotifyWhenChange = jest.fn();
  const onThrottleChange = jest.fn();

  describe('action_frequency_form new rule', () => {
    let wrapper: ReactWrapper<any>;

    async function setup(overrides = {}) {
      const initialRule = {
        name: 'test',
        params: {},
        consumer: ALERTS_FEATURE_ID,
        schedule: {
          interval: '1m',
        },
        actions: [],
        tags: [],
        muteAll: false,
        enabled: false,
        mutedInstanceIds: [],
        notifyWhen: 'onActionGroupChange',
        ...overrides,
      } as unknown as Rule;

      wrapper = mountWithIntl(
        <RuleNotifyWhen
          rule={initialRule}
          throttle={null}
          throttleUnit="m"
          onNotifyWhenChange={onNotifyWhenChange}
          onThrottleChange={onThrottleChange}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it(`should determine initial selection from throttle value if 'notifyWhen' is null`, async () => {
      await setup({ notifyWhen: null });
      const notifyWhenSelect = wrapper.find('[data-test-subj="notifyWhenSelect"]');
      expect(notifyWhenSelect.exists()).toBeTruthy();
      expect(notifyWhenSelect.first().prop('valueOfSelected')).toEqual('onActiveAlert');
    });

    it(`should correctly select 'onActionGroupChange' option on initial render`, async () => {
      await setup();
      const notifyWhenSelect = wrapper.find('[data-test-subj="notifyWhenSelect"]');
      expect(notifyWhenSelect.exists()).toBeTruthy();
      expect(notifyWhenSelect.first().prop('valueOfSelected')).toEqual('onActionGroupChange');
      expect(wrapper.find('[data-test-subj="throttleInput"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="throttleUnitInput"]').exists()).toBeFalsy();
    });

    it(`should correctly select 'onActiveAlert' option on initial render`, async () => {
      await setup({
        notifyWhen: 'onActiveAlert',
      });
      const notifyWhenSelect = wrapper.find('[data-test-subj="notifyWhenSelect"]');
      expect(notifyWhenSelect.exists()).toBeTruthy();
      expect(notifyWhenSelect.first().prop('valueOfSelected')).toEqual('onActiveAlert');
      expect(wrapper.find('[data-test-subj="throttleInput"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="throttleUnitInput"]').exists()).toBeFalsy();
    });

    it(`should correctly select 'onThrottleInterval' option on initial render and render throttle inputs`, async () => {
      await setup({
        notifyWhen: 'onThrottleInterval',
      });
      const notifyWhenSelect = wrapper.find('[data-test-subj="notifyWhenSelect"]');
      expect(notifyWhenSelect.exists()).toBeTruthy();
      expect(notifyWhenSelect.first().prop('valueOfSelected')).toEqual('onThrottleInterval');

      const throttleInput = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleInput.exists()).toBeTruthy();
      expect(throttleInput.at(1).prop('value')).toEqual(1);

      const throttleUnitInput = wrapper.find('[data-test-subj="throttleUnitInput"]');
      expect(throttleUnitInput.exists()).toBeTruthy();
      expect(throttleUnitInput.at(1).prop('value')).toEqual('m');
    });

    it('should update action frequency type correctly', async () => {
      await setup();

      wrapper.find('button[data-test-subj="notifyWhenSelect"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="onActiveAlert"]').simulate('click');
      wrapper.update();
      expect(onNotifyWhenChange).toHaveBeenCalledWith('onActiveAlert');
      expect(onThrottleChange).toHaveBeenCalledWith(null, 'm');

      wrapper.find('button[data-test-subj="notifyWhenSelect"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="onActionGroupChange"]').simulate('click');
      wrapper.update();
      expect(wrapper.find('[data-test-subj="throttleInput"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="throttleUnitInput"]').exists()).toBeFalsy();
      expect(onNotifyWhenChange).toHaveBeenCalledWith('onActionGroupChange');
      expect(onThrottleChange).toHaveBeenCalledWith(null, 'm');
    });

    it('should renders throttle input when custom throttle is selected and update throttle value', async () => {
      await setup({
        notifyWhen: 'onThrottleInterval',
      });

      const newThrottle = 17;
      const throttleField = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleField.exists()).toBeTruthy();
      throttleField.at(1).simulate('change', { target: { value: newThrottle.toString() } });
      const throttleFieldAfterUpdate = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleFieldAfterUpdate.at(1).prop('value')).toEqual(newThrottle);
      expect(onThrottleChange).toHaveBeenCalledWith(17, 'm');

      const newThrottleUnit = 'h';
      const throttleUnitField = wrapper.find('[data-test-subj="throttleUnitInput"]');
      expect(throttleUnitField.exists()).toBeTruthy();
      throttleUnitField.at(1).simulate('change', { target: { value: newThrottleUnit } });
      expect(onThrottleChange).toHaveBeenCalledWith(null, 'h');
    });
  });
});
