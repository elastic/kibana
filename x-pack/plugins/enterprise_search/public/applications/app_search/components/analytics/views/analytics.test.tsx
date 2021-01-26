/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { AnalyticsCards, AnalyticsChart } from '../components';
import { Analytics } from './';

describe('Analytics overview', () => {
  it('renders', () => {
    setMockValues({
      totalQueries: 3,
      totalQueriesNoResults: 2,
      totalClicks: 1,
      queriesPerDay: [10, 20, 30],
      queriesNoResultsPerDay: [1, 2, 3],
      clicksPerDay: [0, 1, 5],
      startDate: '1970-01-01',
    });
    const wrapper = shallow(<Analytics />);

    expect(wrapper.find(AnalyticsCards)).toHaveLength(1);
    expect(wrapper.find(AnalyticsChart)).toHaveLength(1);
  });
});
