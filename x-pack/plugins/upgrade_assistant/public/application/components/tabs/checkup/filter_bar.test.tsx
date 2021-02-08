/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { DeprecationInfo } from '../../../../../../../../src/core/server/elasticsearch/legacy/api_types';
import { LevelFilterOption } from '../../types';
import { FilterBar } from './filter_bar';

const defaultProps = {
  allDeprecations: [
    { level: LevelFilterOption.critical },
    { level: LevelFilterOption.critical },
  ] as DeprecationInfo[],
  currentFilter: LevelFilterOption.critical,
  onFilterChange: jest.fn(),
};

describe('FilterBar', () => {
  test('renders', () => {
    expect(shallow(<FilterBar {...defaultProps} />)).toMatchSnapshot();
  });

  test('clicking button calls onFilterChange', () => {
    const wrapper = mount(<FilterBar {...defaultProps} />);
    wrapper.find('button.euiFilterButton-hasActiveFilters').simulate('click');
    expect(defaultProps.onFilterChange).toHaveBeenCalledTimes(1);
    expect(defaultProps.onFilterChange.mock.calls[0][0]).toEqual(LevelFilterOption.critical);
  });
});
