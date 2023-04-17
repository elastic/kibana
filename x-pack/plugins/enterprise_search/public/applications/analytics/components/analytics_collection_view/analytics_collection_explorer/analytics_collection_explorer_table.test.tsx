/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { mount, shallow } from 'enzyme';

import { ExploreTables } from '../analytics_collection_explore_table_types';

import { AnalyticsCollectionExplorerTable } from './analytics_collection_explorer_table';

describe('AnalyticsCollectionExplorerTable', () => {
  const mockActions = {
    setPageIndex: jest.fn(),
    setPageSize: jest.fn(),
    setSearch: jest.fn(),
    setSelectedTable: jest.fn(),
    setSorting: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    setMockValues({ items: [], selectedTable: ExploreTables.TopClicked });
    setMockActions(mockActions);
  });

  it('should set default selectedTable', () => {
    setMockValues({ items: [], selectedTable: null });
    const wrapper = mount(<AnalyticsCollectionExplorerTable />);

    wrapper.update();

    expect(mockActions.setSelectedTable).toHaveBeenCalledWith(ExploreTables.SearchTerms, {
      direction: 'desc',
      field: 'count',
    });
  });

  it('should call setSelectedTable when click on a tab', () => {
    const tabs = shallow(<AnalyticsCollectionExplorerTable />).find('EuiTab');

    expect(tabs.length).toBe(4);

    tabs.at(2).simulate('click');
    expect(mockActions.setSelectedTable).toHaveBeenCalledWith(ExploreTables.WorsePerformers, {
      direction: 'desc',
      field: 'count',
    });
  });

  it('should call setSorting when table called onChange', () => {
    const table = shallow(<AnalyticsCollectionExplorerTable />).find('EuiBasicTable');

    table.simulate('change', { sort: { direction: 'asc', field: 'test' } });
    expect(mockActions.setSorting).toHaveBeenCalledWith({ direction: 'asc', field: 'test' });
  });

  it('should call setPageIndex when table called onChange', () => {
    const table = shallow(<AnalyticsCollectionExplorerTable />).find('EuiBasicTable');

    table.simulate('change', { page: { index: 23 } });
    expect(mockActions.setPageIndex).toHaveBeenCalledWith(23);
  });

  it('should call setPageSize when table called onChange', () => {
    const table = shallow(<AnalyticsCollectionExplorerTable />).find('EuiBasicTable');

    table.simulate('change', { page: { size: 44 } });
    expect(mockActions.setPageSize).toHaveBeenCalledWith(44);
  });
});
