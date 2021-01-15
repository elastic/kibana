/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockActions } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { ClearFiltersLink } from './clear_filters_link';

import { EuiLink } from '@elastic/eui';

describe('ClearFiltersLink', () => {
  const resetGroupsFilters = jest.fn();

  beforeEach(() => {
    setMockActions({
      resetGroupsFilters,
    });
  });
  it('renders', () => {
    const wrapper = shallow(<ClearFiltersLink />);

    expect(wrapper.find(EuiLink)).toHaveLength(1);
  });

  it('handles click', () => {
    const wrapper = shallow(<ClearFiltersLink />);

    const button = wrapper.find(EuiLink);
    button.simulate('click');

    expect(resetGroupsFilters).toHaveBeenCalled();
  });
});
