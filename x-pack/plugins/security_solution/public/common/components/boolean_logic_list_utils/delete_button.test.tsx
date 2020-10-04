/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntryMatchMock } from '../../../../../lists/common/schemas/types/entry_match.mock';

import { EntryDeleteButtonComponent } from './delete_button';

describe('EntryDeleteButtonComponent', () => {
  test('it renders firstRowDeleteButton for very first entry in builder', () => {
    const wrapper = mount(
      <EntryDeleteButtonComponent
        entryIndex={0}
        itemIndex={0}
        nestedParentIndex={null}
        isOnlyItem={false}
        entries={getExceptionListItemSchemaMock().entries}
        onDelete={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="firstRowDeleteButton"] button')).toHaveLength(1);
  });

  test('it does not render firstRowDeleteButton if entryIndex is not 0', () => {
    const wrapper = mount(
      <EntryDeleteButtonComponent
        entryIndex={1}
        itemIndex={0}
        nestedParentIndex={null}
        isOnlyItem={false}
        entries={getExceptionListItemSchemaMock().entries}
        onDelete={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="firstRowDeleteButton"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="deleteButton"] button')).toHaveLength(1);
  });

  test('it does not render firstRowDeleteButton if itemIndex is not 0', () => {
    const wrapper = mount(
      <EntryDeleteButtonComponent
        entryIndex={0}
        itemIndex={1}
        nestedParentIndex={null}
        isOnlyItem={false}
        entries={getExceptionListItemSchemaMock().entries}
        onDelete={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="firstRowDeleteButton"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="deleteButton"] button')).toHaveLength(1);
  });

  test('it does not render firstRowDeleteButton if nestedParentIndex is not null', () => {
    const wrapper = mount(
      <EntryDeleteButtonComponent
        entryIndex={0}
        itemIndex={0}
        nestedParentIndex={0}
        isOnlyItem={false}
        entries={getExceptionListItemSchemaMock().entries}
        onDelete={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="firstRowDeleteButton"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="deleteButton"] button')).toHaveLength(1);
  });

  test('it invokes "onDelete" when button is clicked', () => {
    const onDelete = jest.fn();

    const wrapper = mount(
      <EntryDeleteButtonComponent
        entryIndex={0}
        itemIndex={1}
        nestedParentIndex={null}
        isOnlyItem={false}
        entries={getExceptionListItemSchemaMock().entries}
        onDelete={onDelete}
      />
    );

    wrapper.find('[data-test-subj="deleteButton"] button').simulate('click');

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(0, null);
  });

  test('it disables button if it is the only entry left and no field has been selected', () => {
    const exceptionItem = {
      ...getExceptionListItemSchemaMock(),
      entries: [{ ...getEntryMatchMock(), field: '' }],
    };
    const wrapper = mount(
      <EntryDeleteButtonComponent
        entryIndex={0}
        itemIndex={0}
        nestedParentIndex={0}
        isOnlyItem
        entries={exceptionItem.entries}
        onDelete={jest.fn()}
      />
    );

    const button = wrapper.find('[data-test-subj="deleteButton"] button').at(0);

    expect(button.prop('disabled')).toBeTruthy();
  });

  test('it does not disable button if it is the only entry left and field has been selected', () => {
    const wrapper = mount(
      <EntryDeleteButtonComponent
        entryIndex={1}
        itemIndex={0}
        nestedParentIndex={null}
        isOnlyItem
        entries={getExceptionListItemSchemaMock().entries}
        onDelete={jest.fn()}
      />
    );

    const button = wrapper.find('[data-test-subj="deleteButton"] button').at(0);

    expect(button.prop('disabled')).toBeFalsy();
  });
});
