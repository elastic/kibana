/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { mount, shallow } from 'enzyme';

import { EuiBasicTable, EuiTab } from '@elastic/eui';

import { FilterBy } from '../../../utils/get_formula_by_filter';

import { ExploreTables } from '../analytics_collection_explore_table_types';

import { AnalyticsCollectionOverviewTable } from './analytics_collection_overview_table';

describe('AnalyticsCollectionOverviewTable', () => {
  const mockValues = {
    activeTableId: 'search_terms',
    analyticsCollection: {
      events_datastream: 'analytics-events-example',
      name: 'Analytics-Collection-1',
    },
    items: [],
    searchFilter: 'searches',
  };
  const mockActions = {
    findDataView: jest.fn(),
    setSelectedTable: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    setMockValues(mockValues);
    setMockActions(mockActions);
  });

  it('should call setSelectedTable with the correct table id when a tab is clicked', () => {
    const wrapper = shallow(<AnalyticsCollectionOverviewTable filterBy={FilterBy.Sessions} />);

    const topReferrersTab = wrapper.find(EuiTab).at(0);
    topReferrersTab.simulate('click');

    expect(mockActions.setSelectedTable).toHaveBeenCalledTimes(1);
    expect(mockActions.setSelectedTable).toHaveBeenCalledWith(ExploreTables.Locations, {
      direction: 'desc',
      field: 'sessions',
    });
  });

  it('should render a table with the selectedTable', () => {
    setMockValues({ ...mockValues, selectedTable: ExploreTables.WorsePerformers });
    const wrapper = mount(<AnalyticsCollectionOverviewTable filterBy={FilterBy.Sessions} />);
    expect(wrapper.find(EuiBasicTable).prop('itemId')).toBe(ExploreTables.WorsePerformers);
  });
});
