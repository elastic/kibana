/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { LevelFilterOption } from '../../types';

import { DeprecationLevelFilter } from './level_filter';

const defaultProps = {
  levelsCount: {
    warning: 4,
    critical: 1,
  },
  currentFilter: 'all' as LevelFilterOption,
  onFilterChange: jest.fn(),
};

describe('DeprecationLevelFilter', () => {
  test('renders', () => {
    expect(shallow(<DeprecationLevelFilter {...defaultProps} />)).toMatchSnapshot();
  });

  test('clicking button calls onFilterChange', () => {
    const wrapper = mount(<DeprecationLevelFilter {...defaultProps} />);
    wrapper.find('button[data-test-subj="criticalLevelFilter"]').simulate('click');
    expect(defaultProps.onFilterChange).toHaveBeenCalledTimes(1);
    expect(defaultProps.onFilterChange.mock.calls[0][0]).toEqual('critical');
  });
});
