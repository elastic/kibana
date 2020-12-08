/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { Alert } from '../../../types';
import { ALERTS_FEATURE_ID } from '../../../../../alerts/common';
import { ActionFrequencyForm } from './action_frequency';

describe('action_frequency_form', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const alertThrottle = null;
  const alertThrottleUnit = 'm';
  const onActionFreqencyChange = jest.fn();
  const onThrottleChange = jest.fn();
  const onThrottleUnitChange = jest.fn();

  describe('action_frequency_form new alert', () => {
    let wrapper: ReactWrapper<any>;

    async function setup(overrides = {}) {
      const initialAlert = ({
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
        notifyOnlyOnActionGroupChange: true,
        ...overrides,
      } as unknown) as Alert;

      wrapper = mountWithIntl(
        <ActionFrequencyForm
          alert={initialAlert}
          throttle={alertThrottle}
          throttleUnit={alertThrottleUnit}
          onActionFreqencyChange={onActionFreqencyChange}
          onThrottleChange={onThrottleChange}
          onThrottleUnitChange={onThrottleUnitChange}
        />
      );

      await act(async () => {
        await nextTick();
        wrapper.update();
      });
    }

    it('should correctly select notifyOnlyOnActionGroupChange if it is true', async () => {
      await setup();
      const actionFrequencySelect = wrapper.find('[data-test-subj="actionFrequencySelect"]');
      expect(actionFrequencySelect.exists()).toBeTruthy();
      expect(actionFrequencySelect.first().prop('valueOfSelected')).toEqual(
        'notifyOnlyOnActionGroupChange'
      );

      expect(wrapper.find('[data-test-subj="throttleInput"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="throttleUnitInput"]').exists()).toBeFalsy();
    });

    it('should correctly select throttleNull selection if notifyOnlyOnActionGroupChange is false and throttle is null', async () => {
      await setup({
        notifyOnlyOnActionGroupChange: false,
      });

      const actionFrequencySelect = wrapper.find('[data-test-subj="actionFrequencySelect"]');
      expect(actionFrequencySelect.exists()).toBeTruthy();
      expect(actionFrequencySelect.first().prop('valueOfSelected')).toEqual('throttleNull');
      expect(wrapper.find('[data-test-subj="throttleInput"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="throttleUnitInput"]').exists()).toBeFalsy();
    });

    it('should correctly render throttle values if defined', async () => {
      await setup({
        notifyOnlyOnActionGroupChange: false,
        throttle: '20m',
      });

      const actionFrequencySelect = wrapper.find('[data-test-subj="actionFrequencySelect"]');
      expect(actionFrequencySelect.exists()).toBeTruthy();
      expect(actionFrequencySelect.first().prop('valueOfSelected')).toEqual('throttleCustom');

      const throttleInput = wrapper.find('[data-test-subj="throttleInput"]');
      expect(throttleInput.exists()).toBeTruthy();
      expect(throttleInput.at(1).prop('value')).toEqual(20);

      const throttleUnitInput = wrapper.find('[data-test-subj="throttleUnitInput"]');
      expect(throttleUnitInput.exists()).toBeTruthy();
      expect(throttleUnitInput.at(1).prop('value')).toEqual('m');
    });

    it('should update action frequency type correctly', async () => {
      await setup();

      wrapper.find('button[data-test-subj="actionFrequencySelect"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="throttleNull"]').simulate('click');
      wrapper.update();
      expect(onActionFreqencyChange).toHaveBeenCalledWith({
        notifyOnlyOnActionGroupChange: false,
        throttle: null,
      });

      wrapper.find('button[data-test-subj="actionFrequencySelect"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="notifyOnlyOnActionGroupChange"]').simulate('click');
      wrapper.update();
      expect(wrapper.find('[data-test-subj="throttleInput"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="throttleUnitInput"]').exists()).toBeFalsy();
      expect(onActionFreqencyChange).toHaveBeenCalledWith({
        notifyOnlyOnActionGroupChange: true,
        throttle: null,
      });
    });

    it('should renders throttle input when custom throttle is selected and update throttle value', async () => {
      await setup();
      wrapper.find('button[data-test-subj="actionFrequencySelect"]').simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="throttleCustom"]').simulate('click');
      wrapper.update();

      expect(wrapper.find('[data-test-subj="throttleUnitInput"]').exists()).toBeTruthy();
      expect(onActionFreqencyChange).toHaveBeenCalled();

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
      const throttleUnitFieldAfterUpdate = wrapper.find('[data-test-subj="throttleUnitInput"]');
      expect(throttleUnitFieldAfterUpdate.at(1).prop('value')).toEqual(newThrottleUnit);
      expect(onThrottleUnitChange).toHaveBeenCalledWith('h');
    });
  });
});
