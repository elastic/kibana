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
  const rangePickerProps = {
    startDate: moment().subtract(30, 'd'),
    endDate: moment(),
    loading: false,
    setStartDate: jest.fn(),
    setEndDate: jest.fn(),
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
});
