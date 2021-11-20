/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';
import { contentSources } from '../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { SourcesList } from './sources_list';
import { TableFilterSourcesDropdown } from './table_filter_sources_dropdown';

const addFilteredSource = jest.fn();
const removeFilteredSource = jest.fn();
const toggleFilterSourcesDropdown = jest.fn();
const closeFilterSourcesDropdown = jest.fn();

describe('TableFilterSourcesDropdown', () => {
  it('renders', () => {
    setMockActions({
      addFilteredSource,
      removeFilteredSource,
      toggleFilterSourcesDropdown,
      closeFilterSourcesDropdown,
    });

    setMockValues({ contentSources, filterSourcesDropdownOpen: false, filteredSources: [] });

    const wrapper = shallow(<TableFilterSourcesDropdown />);

    expect(wrapper.find(SourcesList)).toHaveLength(1);
  });
});
