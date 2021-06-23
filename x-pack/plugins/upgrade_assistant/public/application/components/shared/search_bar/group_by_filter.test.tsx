/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { GroupByOption } from '../../types';
import { GroupByFilter } from './group_by_filter';

const defaultProps = {
  availableGroupByOptions: [GroupByOption.message, GroupByOption.index],
  currentGroupBy: GroupByOption.message,
  onGroupByChange: jest.fn(),
};

describe('GroupByFilter', () => {
  test('renders', () => {
    expect(shallow(<GroupByFilter {...defaultProps} />)).toMatchSnapshot();
  });

  test('clicking button calls onGroupByChange', () => {
    const wrapper = mount(<GroupByFilter {...defaultProps} />);
    wrapper.find('button.euiFilterButton-hasActiveFilters').simulate('click');
    expect(defaultProps.onGroupByChange).toHaveBeenCalledTimes(1);
    expect(defaultProps.onGroupByChange.mock.calls[0][0]).toEqual(GroupByOption.message);
  });
});
