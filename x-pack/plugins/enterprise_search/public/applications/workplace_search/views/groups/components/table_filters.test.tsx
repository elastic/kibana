/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/kea.mock';

import { setMockActions, setMockValues } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { TableFilters } from './table_filters';

import { EuiFieldSearch } from '@elastic/eui';
import { TableFilterSourcesDropdown } from './table_filter_sources_dropdown';
import { TableFilterUsersDropdown } from './table_filter_users_dropdown';

const setFilterValue = jest.fn();

describe('TableFilters', () => {
  beforeEach(() => {
    setMockValues({ filterValue: '', isFederatedAuth: true });
    setMockActions({ setFilterValue });
  });
  it('renders', () => {
    const wrapper = shallow(<TableFilters />);

    expect(wrapper.find(EuiFieldSearch)).toHaveLength(1);
    expect(wrapper.find(TableFilterSourcesDropdown)).toHaveLength(1);
    expect(wrapper.find(TableFilterUsersDropdown)).toHaveLength(0);
  });

  it('renders for non-federated Auth', () => {
    setMockValues({ filterValue: '', isFederatedAuth: false });
    const wrapper = shallow(<TableFilters />);

    expect(wrapper.find(TableFilterUsersDropdown)).toHaveLength(1);
  });

  it('handles search input value change', () => {
    const wrapper = shallow(<TableFilters />);
    const input = wrapper.find(EuiFieldSearch);
    input.simulate('change', { target: { value: 'bar' } });

    expect(setFilterValue).toHaveBeenCalledWith('bar');
  });
});
