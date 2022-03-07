/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { TestProviders } from '../../../../mock';
import { Search } from './search';

const timelineId = 'test';

describe('Search', () => {
  test('it renders the field search input with the expected placeholder text when the searchInput prop is empty', () => {
    const wrapper = mount(
      <TestProviders>
        <Search
          isSearching={false}
          onSearchInputChange={jest.fn()}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="field-search"]').first().props().placeholder).toEqual(
      'Field name'
    );
  });

  test('it renders the "current" search value in the input when searchInput is not empty', () => {
    const searchInput = 'aFieldName';

    const wrapper = mount(
      <TestProviders>
        <Search
          isSearching={false}
          onSearchInputChange={jest.fn()}
          searchInput={searchInput}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('input').props().value).toEqual(searchInput);
  });

  test('it renders the field search input with a spinner when isSearching is true', () => {
    const wrapper = mount(
      <TestProviders>
        <Search
          isSearching={true}
          onSearchInputChange={jest.fn()}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('.euiLoadingSpinner').first().exists()).toBe(true);
  });

  test('it invokes onSearchInputChange when the user types in the search field', () => {
    const onSearchInputChange = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <Search
          isSearching={false}
          onSearchInputChange={onSearchInputChange}
          searchInput=""
          timelineId={timelineId}
        />
      </TestProviders>
    );

    wrapper
      .find('input')
      .first()
      .simulate('change', { target: { value: 'timestamp' } });
    wrapper.update();

    expect(onSearchInputChange).toBeCalled();
  });
});
