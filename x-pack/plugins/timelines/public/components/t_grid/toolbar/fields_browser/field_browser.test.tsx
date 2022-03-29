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

import { FieldsBrowser } from './field_browser';

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
const setShow = jest.fn();
const testProps = {
  columnHeaders: [],
  browserFields: mockBrowserFields,
  restoreFocusTo: React.createRef<HTMLButtonElement>(),
  setShow,
  show: true,
  timelineId,
};
const { storage } = createSecuritySolutionStorageMock();
describe('FieldsBrowser', () => {
  beforeEach(() => {
    jest.resetAllMocks();
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
    expect(setShow).toBeCalledWith(false);
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
        <FieldsBrowser
          columnHeaders={defaultHeaders}
          browserFields={mockBrowserFields}
          restoreFocusTo={React.createRef<HTMLButtonElement>()}
          setShow={jest.fn()}
          show={true}
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

  test('it invokes setShow when the user clicks the Reset Fields button', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} />
      </TestProviders>
    );

    wrapper.find('[data-test-subj="reset-fields"]').first().simulate('click');

    expect(setShow).toBeCalledWith(false);
  });

  test('it renders the search', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="field-search"]').exists()).toBe(true);
  });

  test('it renders the categories pane', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="left-categories-pane"]').exists()).toBe(true);
  });

  test('it renders the fields pane', () => {
    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="fields-pane"]').exists()).toBe(true);
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

  test('does not render the CreateField button when createFieldComponent is provided without a dataViewId', () => {
    const MyTestComponent = () => <div>{'test'}</div>;

    const wrapper = mount(
      <TestProviders>
        <FieldsBrowser {...testProps} createFieldComponent={MyTestComponent} />
      </TestProviders>
    );

    expect(wrapper.find(MyTestComponent).exists()).toBeFalsy();
  });

  test('it renders the CreateField button when createFieldComponent is provided with a dataViewId', () => {
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
        <FieldsBrowser {...testProps} createFieldComponent={MyTestComponent} />
      </TestProviders>
    );

    expect(wrapper.find(MyTestComponent).exists()).toBeTruthy();
  });
});
