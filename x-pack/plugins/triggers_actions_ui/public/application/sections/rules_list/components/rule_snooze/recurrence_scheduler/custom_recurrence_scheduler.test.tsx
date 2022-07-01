/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import moment from 'moment';
import React from 'react';
import { RRuleFrequency } from '../../../../../../types';
import { CustomRecurrenceScheduler } from './custom_recurrence_scheduler';

describe('CustomRecurrenceScheduler', () => {
  const startDate = moment('11/23/1979');
  const initialState = {
    freq: RRuleFrequency.DAILY,
    interval: 1,
    byweekday: [],
    bymonthday: [],
    bymonth: [],
  };
  const onChange = jest.fn();

  beforeEach(() => {
    onChange.mockReset();
  });

  test('render', () => {
    const wrapper = mountWithIntl(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={initialState}
      />
    );
    expect(wrapper.find('[data-test-subj="customRecurrenceScheduler"]').exists()).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="customRecurrenceSchedulerFrequency"]').first().props().value
    ).toEqual(RRuleFrequency.DAILY);
    expect(wrapper.find('[data-test-subj="customRecurrenceSchedulerWeekly"]').exists()).toBeFalsy();
    expect(
      wrapper.find('[data-test-subj="customRecurrenceSchedulerMonthly"]').exists()
    ).toBeFalsy();
  });

  test('render weekly options', () => {
    const wrapper = mountWithIntl(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={{ ...initialState, freq: RRuleFrequency.WEEKLY }}
      />
    );
    expect(
      wrapper.find('[data-test-subj="customRecurrenceSchedulerWeekly"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="customRecurrenceSchedulerFrequency"]').first().props().value
    ).toEqual(RRuleFrequency.WEEKLY);
  });

  test('render monthly options', () => {
    const wrapper = mountWithIntl(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={{ ...initialState, freq: RRuleFrequency.MONTHLY }}
      />
    );
    expect(
      wrapper.find('[data-test-subj="customRecurrenceSchedulerMonthly"]').exists()
    ).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="customRecurrenceSchedulerFrequency"]').first().props().value
    ).toEqual(RRuleFrequency.MONTHLY);
  });

  test('should call onChange when state changed ', () => {
    const wrapper = mountWithIntl(
      <CustomRecurrenceScheduler
        startDate={startDate}
        onChange={onChange}
        initialState={initialState}
      />
    );

    wrapper.find('[data-test-subj="customRecurrenceSchedulerFrequency"]').first().simulate('click');
    wrapper.find('option[data-test-subj="ruleSnoozeSchedulerRecurWeek"]').first().simulate('click');
    expect(onChange).toHaveBeenCalled();
  });
});
