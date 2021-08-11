/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { mount } from 'enzyme';

import { TestProviders } from '../../../mock';
import { EnrichmentRangePicker } from './enrichment_range_picker';

describe('EnrichmentRangePicker', () => {
  const setStartDateSpy = jest.fn();
  const setEndDateSpy = jest.fn();

  const rangePickerProps = {
    startDate: moment().subtract(30, 'd'),
    endDate: moment(),
    loading: false,
    setStartDate: setStartDateSpy,
    setEndDate: setEndDateSpy,
  };

  it('renders a date picker and a button', () => {
    const wrapper = mount(
      <TestProviders>
        <EnrichmentRangePicker {...rangePickerProps} />
      </TestProviders>
    );

    expect(wrapper.exists('[data-test-subj="enrichment-query-range-picker"]')).toEqual(true);
    expect(wrapper.exists('[data-test-subj="enrichment-button"]')).toEqual(true);
  });

  it('invokes setStartDate', () => {
    const wrapper = mount(
      <TestProviders>
        <EnrichmentRangePicker {...rangePickerProps} />
      </TestProviders>
    );

    wrapper
      .find('input.start-picker')
      .simulate('change', { target: { value: '08/10/2019 06:29 PM' } });
    wrapper.find('[data-test-subj="enrichment-button"]').hostNodes().simulate('click');

    expect(setStartDateSpy).toHaveBeenCalled();
  });

  it('invokes setEndDate', () => {
    const wrapper = mount(
      <TestProviders>
        <EnrichmentRangePicker {...rangePickerProps} />
      </TestProviders>
    );

    wrapper
      .find('input.start-picker')
      .simulate('change', { target: { value: '08/10/2019 06:29 PM' } });
    wrapper
      .find('input.end-picker')
      .simulate('change', { target: { value: '08/11/2019 06:29 PM' } });
    wrapper.find('[data-test-subj="enrichment-button"]').hostNodes().simulate('click');

    expect(setEndDateSpy).toHaveBeenCalled();
  });
});
