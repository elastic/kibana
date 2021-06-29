/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { AnalyticsChart } from '../../analytics';

import { TotalCharts } from './total_charts';

describe('TotalCharts', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    jest.clearAllMocks();
    setMockValues({
      startDate: '1970-01-01',
      queriesPerDay: [0, 1, 2, 3, 5, 10, 50],
      operationsPerDay: [0, 0, 0, 0, 0, 0, 0],
    });
    wrapper = shallow(<TotalCharts />);
  });

  it('renders the total queries chart', () => {
    const panel = wrapper.find('[data-test-subj="TotalQueriesChart"]');

    expect(panel.prop('title')).toEqual(<h2>Total queries</h2>);
    expect(panel.find(AnalyticsChart)).toHaveLength(1);
  });

  it('renders the total API operations chart', () => {
    const panel = wrapper.find('[data-test-subj="TotalApiOperationsChart"]');

    expect(panel.prop('title')).toEqual(<h2>Total API operations</h2>);
    expect(panel.find(AnalyticsChart)).toHaveLength(1);
  });
});
