/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders, mockBrowserFields, defaultHeaders } from '../../../../mock';
import { tGridActions } from '../../../../store/t_grid';

import { FieldsBrowser } from './field_browser';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('FieldsBrowser', () => {
  const timelineId = 'test';

  test('it renders the Close button', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          columnHeaders={[]}
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          searchInput={''}
          isSearching={false}
          onCategorySelected={jest.fn()}
          onHide={jest.fn()}
          onSearchInputChange={jest.fn()}
          restoreFocusTo={React.createRef<HTMLButtonElement>()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="close"]').first().text()).toEqual('Close');
  });

  test('it invokes the Close button', () => {
    const onHide = jest.fn();
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          columnHeaders={[]}
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          searchInput={''}
          isSearching={false}
          onCategorySelected={jest.fn()}
          onHide={onHide}
          onSearchInputChange={jest.fn()}
          restoreFocusTo={React.createRef<HTMLButtonElement>()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="close"]').first().simulate('click');
    expect(onHide).toBeCalled();
  });

  test('it renders the Reset Fields button', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          columnHeaders={[]}
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          searchInput={''}
          isSearching={false}
          onCategorySelected={jest.fn()}
          onHide={jest.fn()}
          onSearchInputChange={jest.fn()}
          restoreFocusTo={React.createRef<HTMLButtonElement>()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="reset-fields"]').first().text()).toEqual('Reset Fields');
  });

  test('it invokes updateColumns action when the user clicks the Reset Fields button', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          columnHeaders={defaultHeaders}
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          searchInput={''}
          isSearching={false}
          onCategorySelected={jest.fn()}
          onHide={jest.fn()}
          onSearchInputChange={jest.fn()}
          restoreFocusTo={React.createRef<HTMLButtonElement>()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="reset-fields"]').first().simulate('click');

    expect(mockDispatch).toBeCalledWith(
      tGridActions.updateColumns({
        id: timelineId,
        columns: defaultHeaders,
      })
    );
  });

  test('it invokes onHide when the user clicks the Reset Fields button', () => {
    const onHide = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          columnHeaders={[]}
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          searchInput={''}
          isSearching={false}
          onCategorySelected={jest.fn()}
          onHide={onHide}
          onSearchInputChange={jest.fn()}
          restoreFocusTo={React.createRef<HTMLButtonElement>()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="reset-fields"]').first().simulate('click');

    expect(onHide).toBeCalled();
  });

  test('it renders the search', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          columnHeaders={[]}
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          searchInput={''}
          isSearching={false}
          onCategorySelected={jest.fn()}
          onHide={jest.fn()}
          onSearchInputChange={jest.fn()}
          restoreFocusTo={React.createRef<HTMLButtonElement>()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="field-search"]').exists()).toBe(true);
  });

  test('it renders the categories pane', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          columnHeaders={[]}
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          searchInput={''}
          isSearching={false}
          onCategorySelected={jest.fn()}
          onHide={jest.fn()}
          onSearchInputChange={jest.fn()}
          restoreFocusTo={React.createRef<HTMLButtonElement>()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="left-categories-pane"]').exists()).toBe(true);
  });

  test('it renders the fields pane', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          columnHeaders={[]}
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          searchInput={''}
          isSearching={false}
          onCategorySelected={jest.fn()}
          onHide={jest.fn()}
          onSearchInputChange={jest.fn()}
          restoreFocusTo={React.createRef<HTMLButtonElement>()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="fields-pane"]').exists()).toBe(true);
  });

  test('focuses the search input when the component mounts', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          columnHeaders={[]}
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          searchInput={''}
          isSearching={false}
          onCategorySelected={jest.fn()}
          onHide={jest.fn()}
          onSearchInputChange={jest.fn()}
          restoreFocusTo={React.createRef<HTMLButtonElement>()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="field-search"]').first().getDOMNode().id ===
        document.activeElement!.id
    ).toBe(true);
  });

  test('it invokes onSearchInputChange when the user types in the field search input', () => {
    const onSearchInputChange = jest.fn();
    const inputText = 'event.category';

    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          columnHeaders={[]}
          browserFields={mockBrowserFields}
          filteredBrowserFields={mockBrowserFields}
          searchInput={''}
          isSearching={false}
          onCategorySelected={jest.fn()}
          onHide={jest.fn()}
          onSearchInputChange={onSearchInputChange}
          restoreFocusTo={React.createRef<HTMLButtonElement>()}
          selectedCategoryId={''}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    const searchField = wrapper.find('[data-test-subj="field-search"]').first();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const changeEvent: any = { target: { value: inputText } };
    const onChange = searchField.props().onChange;

    onChange!(changeEvent);
    searchField.simulate('change').update();

    expect(onSearchInputChange).toBeCalledWith(inputText);
  });
});
