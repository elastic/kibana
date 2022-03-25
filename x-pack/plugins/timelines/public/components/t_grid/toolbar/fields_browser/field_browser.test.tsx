/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders, mockBrowserFields, defaultHeaders } from '../../../../mock';
import { mockGlobalState } from '../../../../mock/global_state';
import { tGridActions } from '../../../../store/t_grid';

import { FieldsBrowser, FieldsBrowserComponentProps } from './field_browser';

import { createStore, State } from '../../../../types';
import { createSecuritySolutionStorageMock } from '../../../../mock/mock_local_storage';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
const timelineId = 'test';
const onHide = jest.fn();
const testProps: FieldsBrowserComponentProps = {
  columnHeaders: [],
  filteredBrowserFields: mockBrowserFields,
  searchInput: '',
  appliedFilterInput: '',
  isSearching: false,
  setSelectedCategoryIds: jest.fn(),
  onHide,
  onSearchInputChange: jest.fn(),
  restoreFocusTo: React.createRef<HTMLButtonElement>(),
  selectedCategoryIds: [],
  timelineId,
  filterSelectedEnabled: false,
  onFilterSelectedChange: jest.fn(),
};
const { storage } = createSecuritySolutionStorageMock();

describe('FieldsBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the Close button', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="close"]').first().text()).toEqual('Close');
  });

  test('it invokes the Close button', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="close"]').first().simulate('click');
    expect(onHide).toBeCalled();
  });

  test('it renders the Reset Fields button', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="reset-fields"]').first().text()).toEqual('Reset Fields');
  });

  test('it invokes updateColumns action when the user clicks the Reset Fields button', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} columnHeaders={defaultHeaders} />
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
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="reset-fields"]').first().simulate('click');

    expect(onHide).toBeCalled();
  });

  test('it renders the search', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="field-search"]').exists()).toBe(true);
  });

  test('it renders the categories selector', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="categories-selector"]').exists()).toBe(true);
  });

  test('it renders the fields table', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="field-table"]').exists()).toBe(true);
  });

  test('focuses the search input when the component mounts', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} />
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="field-search"]').first().getDOMNode().id ===
        document.activeElement?.id
    ).toBe(true);
  });

  test('it invokes onSearchInputChange when the user types in the field search input', () => {
    const onSearchInputChange = jest.fn();
    const inputText = 'event.category';

    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} onSearchInputChange={onSearchInputChange} />
      </TestProviders>
    );

    const searchField = wrapper.find('[data-test-subj="field-search"]').first();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const changeEvent: any = { target: { value: inputText } };
    const onChange = searchField.props().onChange;

    onChange?.(changeEvent);
    searchField.simulate('change').update();

    expect(onSearchInputChange).toBeCalledWith(inputText);
  });

  test('does not render the CreateFieldButton when it is provided but does not have a dataViewId', () => {
    const MyTestComponent = () => <div>{'test'}</div>;

    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser
          {...testProps}
          options={{
            createFieldButton: MyTestComponent,
          }}
        />
      </TestProviders>
    );

    expect(wrapper.find(MyTestComponent).exists()).toBeFalsy();
  });

  test('it renders the CreateFieldButton when it is provided and have a dataViewId', () => {
    const state: State = {
      ...mockGlobalState,
      timelineById: {
        ...mockGlobalState.timelineById,
        test: {
          ...mockGlobalState.timelineById.test,
          dataViewId: 'security-solution-default',
        },
      },
    };
    const store = createStore(state, storage);

    const MyTestComponent = () => <div>{'test'}</div>;

    const wrapper = mount(
      <TestProviders store={store}>
        <FieldsBrowser
          {...testProps}
          options={{
            createFieldButton: MyTestComponent,
          }}
        />
      </TestProviders>
    );

    expect(wrapper.find(MyTestComponent).exists()).toBeTruthy();
  });
});
