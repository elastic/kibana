/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../../__mocks__/react_router';

import React from 'react';

import { shallow } from 'enzyme';

import { AnalyticsLayout } from '../analytics_layout';
import { AnalyticsCards, AnalyticsChart, QueryClicksTable } from '../components';

import { QueryDetail } from '.';

describe('QueryDetail', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ query: 'some-query' });

    setMockValues({
      totalQueriesForQuery: 100,
      queriesPerDayForQuery: [0, 5, 10],
    });
  });

  it('renders', () => {
    const wrapper = shallow(<QueryDetail />);

    expect(wrapper.find(AnalyticsLayout).prop('title')).toEqual('"some-query"');
    expect(wrapper.find(AnalyticsLayout).prop('breadcrumbs')).toEqual(['Query', 'some-query']);

    expect(wrapper.find(AnalyticsCards)).toHaveLength(1);
    expect(wrapper.find(AnalyticsChart)).toHaveLength(1);
    expect(wrapper.find(QueryClicksTable)).toHaveLength(1);
  });

  it('renders empty "" search titles correctly', () => {
    mockUseParams.mockReturnValue({ query: '""' });
    const wrapper = shallow(<QueryDetail />);

    expect(wrapper.find(AnalyticsLayout).prop('title')).toEqual('""');
  });
});
