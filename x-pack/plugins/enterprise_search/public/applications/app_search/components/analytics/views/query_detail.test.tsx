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

import { SetAppSearchChrome as SetPageChrome } from '../../../../shared/kibana_chrome';

import { AnalyticsLayout } from '../analytics_layout';
import { AnalyticsCards, AnalyticsChart, QueryClicksTable } from '../components';

import { QueryDetail } from './';

describe('QueryDetail', () => {
  const mockBreadcrumbs = ['Engines', 'some-engine', 'Analytics'];

  beforeEach(() => {
    mockUseParams.mockReturnValue({ query: 'some-query' });

    setMockValues({
      totalQueriesForQuery: 100,
      queriesPerDayForQuery: [0, 5, 10],
    });
  });

  it('renders', () => {
    const wrapper = shallow(<QueryDetail breadcrumbs={mockBreadcrumbs} />);

    expect(wrapper.find(AnalyticsLayout).prop('title')).toEqual('"some-query"');
    expect(wrapper.find(SetPageChrome).prop('trail')).toEqual([
      'Engines',
      'some-engine',
      'Analytics',
      'Query',
      'some-query',
    ]);

    expect(wrapper.find(AnalyticsCards)).toHaveLength(1);
    expect(wrapper.find(AnalyticsChart)).toHaveLength(1);
    expect(wrapper.find(QueryClicksTable)).toHaveLength(1);
  });

  it('renders empty "" search titles correctly', () => {
    mockUseParams.mockReturnValue({ query: '""' });
    const wrapper = shallow(<QueryDetail breadcrumbs={mockBreadcrumbs} />);

    expect(wrapper.find(AnalyticsLayout).prop('title')).toEqual('""');
  });
});
