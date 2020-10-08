/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntryMatchMock } from '../../../../../../lists/common/schemas/types/entry_match.mock';

import { BuilderEntryDeleteButtonComponent } from './entry_delete_button';

describe('BuilderEntryDeleteButtonComponent', () => {
  test('it renders firstRowBuilderDeleteButton for very first entry in builder', () => {
    const wrapper = mount(
      <BuilderEntryDeleteButtonComponent
        entryIndex={0}
        exceptionItemIndex={0}
        nestedParentIndex={null}
        isOnlyItem={false}
        entries={getExceptionListItemSchemaMock().entries}
        onDelete={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="firstRowBuilderDeleteButton"] button')).toHaveLength(1);
  });

  test('it does not render firstRowBuilderDeleteButton if entryIndex is not 0', () => {
    const wrapper = mount(
      <BuilderEntryDeleteButtonComponent
        entryIndex={1}
        exceptionItemIndex={0}
        nestedParentIndex={null}
        isOnlyItem={false}
        entries={getExceptionListItemSchemaMock().entries}
        onDelete={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="firstRowBuilderDeleteButton"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="builderDeleteButton"] button')).toHaveLength(1);
  });

  test('it does not render firstRowBuilderDeleteButton if exceptionItemIndex is not 0', () => {
    const wrapper = mount(
      <BuilderEntryDeleteButtonComponent
        entryIndex={0}
        exceptionItemIndex={1}
        nestedParentIndex={null}
        isOnlyItem={false}
        entries={getExceptionListItemSchemaMock().entries}
        onDelete={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="firstRowBuilderDeleteButton"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="builderDeleteButton"] button')).toHaveLength(1);
  });

  test('it does not render firstRowBuilderDeleteButton if nestedParentIndex is not null', () => {
    const wrapper = mount(
      <BuilderEntryDeleteButtonComponent
        entryIndex={0}
        exceptionItemIndex={0}
        nestedParentIndex={0}
        isOnlyItem={false}
        entries={getExceptionListItemSchemaMock().entries}
        onDelete={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="firstRowBuilderDeleteButton"]')).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="builderDeleteButton"] button')).toHaveLength(1);
  });

  test('it invokes "onDelete" when button is clicked', () => {
    const onDelete = jest.fn();

    const wrapper = mount(
      <BuilderEntryDeleteButtonComponent
        entryIndex={0}
        exceptionItemIndex={1}
        nestedParentIndex={null}
        isOnlyItem={false}
        entries={getExceptionListItemSchemaMock().entries}
        onDelete={onDelete}
      />
    );

    wrapper.find('[data-test-subj="builderDeleteButton"] button').simulate('click');

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(0, null);
  });

  test('it disables button if it is the only entry left and no field has been selected', () => {
    const exceptionItem = {
      ...getExceptionListItemSchemaMock(),
      entries: [{ ...getEntryMatchMock(), field: '' }],
    };
    const wrapper = mount(
      <BuilderEntryDeleteButtonComponent
        entryIndex={0}
        exceptionItemIndex={0}
        nestedParentIndex={0}
        isOnlyItem
        entries={exceptionItem.entries}
        onDelete={jest.fn()}
      />
    );

    const button = wrapper.find('[data-test-subj="builderDeleteButton"] button').at(0);

    expect(button.prop('disabled')).toBeTruthy();
  });

  test('it does not disable button if it is the only entry left and field has been selected', () => {
    const wrapper = mount(
      <BuilderEntryDeleteButtonComponent
        entryIndex={1}
        exceptionItemIndex={0}
        nestedParentIndex={null}
        isOnlyItem
        entries={getExceptionListItemSchemaMock().entries}
        onDelete={jest.fn()}
      />
    );

    const button = wrapper.find('[data-test-subj="builderDeleteButton"] button').at(0);

    expect(button.prop('disabled')).toBeFalsy();
  });
});
