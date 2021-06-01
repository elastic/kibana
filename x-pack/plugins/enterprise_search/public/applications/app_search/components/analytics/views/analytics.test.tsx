/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import {
  AnalyticsCards,
  AnalyticsChart,
  AnalyticsSection,
  AnalyticsTable,
  RecentQueriesTable,
} from '../components';

import { Analytics, ViewAllButton } from './analytics';

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
      topQueries: [],
      topQueriesNoResults: [],
      topQueriesNoClicks: [],
      topQueriesWithClicks: [],
      recentQueries: [],
    });
    const wrapper = shallow(<Analytics />);

    expect(wrapper.find(AnalyticsCards)).toHaveLength(1);
    expect(wrapper.find(AnalyticsChart)).toHaveLength(1);
    expect(wrapper.find(AnalyticsSection)).toHaveLength(2);
    expect(wrapper.find(AnalyticsTable)).toHaveLength(4);
    expect(wrapper.find(RecentQueriesTable)).toHaveLength(1);
  });

  describe('ViewAllButton', () => {
    it('renders', () => {
      const to = '/analytics/top_queries';
      const wrapper = shallow(<ViewAllButton to={to} />);

      expect(wrapper.prop('to')).toEqual(to);
    });
  });
});
