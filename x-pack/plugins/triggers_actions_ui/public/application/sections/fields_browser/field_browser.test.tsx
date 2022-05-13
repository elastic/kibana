/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { FieldsBrowser, FieldsBrowserComponentProps } from './field_browser';
import { mockBrowserFields } from './mock';

const onHide = jest.fn();
const testProps: FieldsBrowserComponentProps = {
  columnIds: [],
  filteredBrowserFields: mockBrowserFields,
  searchInput: '',
  appliedFilterInput: '',
  isSearching: false,
  setSelectedCategoryIds: jest.fn(),
  onHide,
  onSearchInputChange: jest.fn(),
  restoreFocusTo: React.createRef<HTMLButtonElement>(),
  selectedCategoryIds: [],
  filterSelectedEnabled: false,
  onFilterSelectedChange: jest.fn(),
  onToggleColumn: jest.fn(),
  onUpdateColumns: jest.fn(),
  defaultColumnsIds: ['test'],
};
describe('FieldsBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders the Close button', () => {
    const wrapper = mount(<FieldsBrowser {...testProps} />);

    expect(wrapper.find('[data-test-subj="close"]').first().text()).toEqual('Close');
  });

  test('it invokes the Close button', () => {
    const wrapper = mount(<FieldsBrowser {...testProps} />);

    wrapper.find('[data-test-subj="close"]').first().simulate('click');
    expect(onHide).toBeCalled();
  });

  test('it renders the Reset Fields button', () => {
    const wrapper = mount(<FieldsBrowser {...testProps} />);

    expect(wrapper.find('[data-test-subj="reset-fields"]').first().text()).toEqual('Reset Fields');
  });

  test('it invokes updateColumns action when the user clicks the Reset Fields button', () => {
    const wrapper = mount(<FieldsBrowser {...testProps} columnIds={['test']} />);

    wrapper.find('[data-test-subj="reset-fields"]').first().simulate('click');
  });

  test('it invokes onHide when the user clicks the Reset Fields button', () => {
    const wrapper = mount(<FieldsBrowser {...testProps} />);

    wrapper.find('[data-test-subj="reset-fields"]').first().simulate('click');

    expect(onHide).toBeCalled();
  });

  test('it renders the search', () => {
    const wrapper = mount(<FieldsBrowser {...testProps} />);

    expect(wrapper.find('[data-test-subj="field-search"]').exists()).toBe(true);
  });

  test('it renders the categories selector', () => {
    const wrapper = mount(<FieldsBrowser {...testProps} />);

    expect(wrapper.find('[data-test-subj="categories-selector"]').exists()).toBe(true);
  });

  test('it renders the fields table', () => {
    const wrapper = mount(<FieldsBrowser {...testProps} />);

    expect(wrapper.find('[data-test-subj="field-table"]').exists()).toBe(true);
  });

  test('focuses the search input when the component mounts', () => {
    const wrapper = mount(<FieldsBrowser {...testProps} />);

    expect(
      wrapper.find('[data-test-subj="field-search"]').first().getDOMNode().id ===
        document.activeElement?.id
    ).toBe(true);
  });

  test('it invokes onSearchInputChange when the user types in the field search input', () => {
    const onSearchInputChange = jest.fn();
    const inputText = 'event.category';

    const wrapper = mount(
      <FieldsBrowser {...testProps} onSearchInputChange={onSearchInputChange} />
    );

    const searchField = wrapper.find('[data-test-subj="field-search"]').first();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const changeEvent: any = { target: { value: inputText } };
    const onChange = searchField.props().onChange;

    onChange?.(changeEvent);
    searchField.simulate('change').update();

    expect(onSearchInputChange).toBeCalledWith(inputText);
  });

  test('it renders the CreateFieldButton', () => {
    const MyTestComponent = () => <div>{'test'}</div>;

    const wrapper = mount(
      <FieldsBrowser
        {...testProps}
        options={{
          createFieldButton: MyTestComponent,
        }}
      />
    );

    expect(wrapper.find(MyTestComponent).exists()).toBeTruthy();
  });
});
