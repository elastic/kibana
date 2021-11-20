/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldSearch } from '@elastic/eui';

import { TableFilterSourcesDropdown } from './table_filter_sources_dropdown';
import { TableFilters } from './table_filters';

const setFilterValue = jest.fn();

describe('TableFilters', () => {
  beforeEach(() => {
    setMockValues({ filterValue: '' });
    setMockActions({ setFilterValue });
  });
  it('renders', () => {
    const wrapper = shallow(<TableFilters />);

    expect(wrapper.find(EuiFieldSearch)).toHaveLength(1);
    expect(wrapper.find(TableFilterSourcesDropdown)).toHaveLength(1);
  });

  it('handles search input value change', () => {
    const wrapper = shallow(<TableFilters />);
    const input = wrapper.find(EuiFieldSearch);
    input.simulate('change', { target: { value: 'bar' } });

    expect(setFilterValue).toHaveBeenCalledWith('bar');
  });
});
