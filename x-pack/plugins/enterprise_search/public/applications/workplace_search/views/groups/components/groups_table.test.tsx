/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';
import { groups } from '../../../__mocks__/groups.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiTable } from '@elastic/eui';

import { DEFAULT_META } from '../../../../shared/constants';
import { TablePaginationBar } from '../../../components/shared/table_pagination_bar';

import { ClearFiltersLink } from './clear_filters_link';
import { GroupRow } from './group_row';
import { GroupsTable } from './groups_table';

const setActivePage = jest.fn();

const mockValues = {
  groupsMeta: DEFAULT_META,
  groups,
  hasFiltersSet: false,
};

describe('GroupsTable', () => {
  beforeEach(() => {
    setMockActions({ setActivePage });
    setMockValues(mockValues);
  });

  it('renders', () => {
    const wrapper = shallow(<GroupsTable />);

    expect(wrapper.find(EuiTable)).toHaveLength(1);
    expect(wrapper.find(GroupRow)).toHaveLength(1);
  });

  it('handles pagination', () => {
    setMockValues({
      ...mockValues,
      groupsMeta: {
        page: {
          current: 1,
          size: 10,
          total_pages: 3,
          total_results: 30,
        },
      },
    });

    const wrapper = shallow(<GroupsTable />);
    wrapper.find(TablePaginationBar).first().invoke('onChangePage')(1);

    expect(setActivePage).toHaveBeenCalledWith(2);
    expect(wrapper.find(TablePaginationBar)).toHaveLength(2);
  });

  it('renders clear filters link when filters set', () => {
    setMockValues({ ...mockValues, hasFiltersSet: true });
    const wrapper = shallow(<GroupsTable />);

    expect(wrapper.find(ClearFiltersLink)).toHaveLength(1);
  });
});
