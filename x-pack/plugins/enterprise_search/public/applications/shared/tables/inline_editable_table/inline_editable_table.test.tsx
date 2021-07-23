/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { ReorderableTable } from '../reorderable_table';

import { InlineEditableTable } from './inline_editable_table';

jest.mock('./inline_editable_table_logic', () => ({
  getInlineEditableTableLogic: jest.fn().mockReturnValue(jest.fn()),
}));
import { getInlineEditableTableLogic } from './inline_editable_table_logic';

const items = [{ id: 1 }, { id: 2 }];
const requiredParams = {
  items,
  instanceId: 'MyInstance',
  title: 'Some Title',
};

describe('InlineEditableTable', () => {
  const mockValues = {};
  const mockActions = {};

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(mockValues);
    setMockActions(mockActions);
  });

  it('renders a ReorderableTable', () => {
    const wrapper = shallow(<InlineEditableTable {...requiredParams} items={items} />);

    const reorderableTable = wrapper.find(ReorderableTable);
    expect(reorderableTable.exists()).toBe(true);
    expect(reorderableTable.prop('items')).toEqual(items);
    expect(wrapper.find('[data-test-subj="actionButton"]').children().text()).toEqual('New row');
  });

  it('renders a description if one is provided', () => {
    const wrapper = shallow(
      <InlineEditableTable {...requiredParams} description={<p>Some Description</p>} />
    );
    expect(wrapper.find('[data-test-subj="description"]').exists()).toBe(true);
  });

  it('can specify items in the table that are uneditable', () => {
    const uneditableItems = [{ id: 3 }];
    const wrapper = shallow(
      <InlineEditableTable {...requiredParams} uneditableItems={uneditableItems} />
    );
    expect(wrapper.find(ReorderableTable).prop('unreorderableItems')).toBe(uneditableItems);
  });

  it('can apply an additiona className', () => {
    const wrapper = shallow(
      <InlineEditableTable {...requiredParams} className="myTestClassName" />
    );
    expect(wrapper.find('.editableTable.myTestClassName').exists()).toBe(true);
  });

  it('uses the instanceId prop to key the included logic', () => {
    shallow(<InlineEditableTable {...requiredParams} instanceId="MyInstance" />);
    expect(getInlineEditableTableLogic()).toHaveBeenCalledWith({ instanceId: 'MyInstance' });
  });

  it('will use the value of addButtonText as custom text on the New Row button', () => {
    const wrapper = shallow(
      <InlineEditableTable {...requiredParams} addButtonText="Add a new row custom text" />
    );
    expect(wrapper.find('[data-test-subj="actionButton"]').children().text()).toEqual(
      'Add a new row custom text'
    );
  });

  describe('when a user is editing an unsaved item', () => {
    beforeEach(() => setMockValues({ ...mockValues, isEditingUnsavedItem: true }));

    it('will change the displayed items to END with an empty item', () => {
      const wrapper = shallow(<InlineEditableTable {...requiredParams} items={items} />);
      expect(wrapper.find(ReorderableTable).prop('items')).toEqual([...items, {}]);
    });

    it('will change the displayed items to START with an empty item when there are uneditableItems', () => {
      const wrapper = shallow(
        <InlineEditableTable {...requiredParams} items={items} uneditableItems={[{ id: 3 }]} />
      );

      expect(wrapper.find(ReorderableTable).prop('items')).toEqual([{}, ...items]);
    });
  });

  it('will style the row that is currently being edited', () => {
    setMockValues({ ...mockValues, isEditing: true, editingItemId: 2 });
    const itemList = [{ id: 1 }, { id: 2 }];
    const wrapper = shallow(<InlineEditableTable {...requiredParams} items={itemList} />);
    const rowProps = wrapper.find(ReorderableTable).prop('rowProps') as (item: any) => object;
    expect(rowProps(items[0])).toEqual({ className: '' });
    // Since editingItemId is 2 and the second item (position 1) in item list has an id of 2, it gets this class
    expect(rowProps(items[1])).toEqual({ className: 'is-being-edited' });
  });
});
