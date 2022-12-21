/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';
import { BindLogic } from 'kea';

import { ReorderableTable } from '../reorderable_table';

jest.mock('./get_updated_columns', () => ({
  getUpdatedColumns: jest.fn(),
}));
import { getUpdatedColumns } from './get_updated_columns';

import { InlineEditableTable, InlineEditableTableContents } from './inline_editable_table';
import { InlineEditableTableLogic } from './inline_editable_table_logic';

const items = [{ id: 1 }, { id: 2 }];
const requiredParams = {
  columns: [],
  items,
  title: 'Some Title',
};

interface Foo {
  id: number;
}

describe('InlineEditableTable', () => {
  const mockValues = {};
  const mockActions = {};

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(mockValues);
    setMockActions(mockActions);
  });

  it('wraps the table in a bound logic, and passes through only required props to the underlying component', () => {
    const instanceId = 'MyInstance';
    const onAdd = jest.fn();
    const onDelete = jest.fn();
    const onReorder = jest.fn();
    const onUpdate = jest.fn();
    const transformItem = jest.fn();
    const validateItem = jest.fn();
    const wrapper = shallow(
      <InlineEditableTable
        {...requiredParams}
        instanceId={instanceId}
        onAdd={onAdd}
        onDelete={onDelete}
        onReorder={onReorder}
        onUpdate={onUpdate}
        transformItem={transformItem}
        validateItem={validateItem}
      />
    );
    const bindLogic = wrapper.find(BindLogic);
    expect(bindLogic.props()).toEqual(
      expect.objectContaining({
        logic: InlineEditableTableLogic,
        props: {
          columns: requiredParams.columns,
          instanceId,
          onAdd,
          onDelete,
          onReorder,
          onUpdate,
          transformItem,
          validateItem,
        },
      })
    );

    expect(bindLogic.children().props()).toEqual(requiredParams);
  });

  it('renders a ReorderableTable', () => {
    const wrapper = shallow(<InlineEditableTableContents {...requiredParams} items={items} />);
    const reorderableTable = wrapper.find(ReorderableTable);
    expect(reorderableTable.exists()).toBe(true);
    expect(reorderableTable.prop('items')).toEqual(items);
    expect(
      wrapper.find('[data-test-subj="inlineEditableTableActionButton"]').children().text()
    ).toEqual('New row');
  });

  it('renders a title if one is provided', () => {
    const wrapper = shallow(
      <InlineEditableTableContents {...requiredParams} description={<p>Some Description</p>} />
    );
    expect(wrapper.find('[data-test-subj="inlineEditableTableTitle"]').exists()).toBe(true);
  });

  it('does not render a title if none is provided', () => {
    const wrapper = shallow(
      <InlineEditableTableContents
        {...{ ...requiredParams, title: '' }}
        description={<p>Some Description</p>}
      />
    );
    expect(wrapper.find('[data-test-subj="inlineEditableTableTitle"]').exists()).toBe(false);
  });

  it('renders a description if one is provided', () => {
    const wrapper = shallow(
      <InlineEditableTableContents {...requiredParams} description={<p>Some Description</p>} />
    );
    expect(wrapper.find('[data-test-subj="inlineEditableTableDescription"]').exists()).toBe(true);
  });

  it('renders no description if none is provided', () => {
    const wrapper = shallow(<InlineEditableTableContents {...requiredParams} />);
    expect(wrapper.find('[data-test-subj="inlineEditableTableDescription"]').exists()).toBe(false);
  });

  it('can specify items in the table that are uneditable', () => {
    const uneditableItems = [{ id: 3 }];
    const wrapper = shallow(
      <InlineEditableTableContents {...requiredParams} uneditableItems={uneditableItems} />
    );
    expect(wrapper.find(ReorderableTable).prop('unreorderableItems')).toBe(uneditableItems);
  });

  it('can apply an additional className', () => {
    const wrapper = shallow(
      <InlineEditableTableContents {...requiredParams} className="myTestClassName" />
    );
    expect(wrapper.find('.editableTable.myTestClassName').exists()).toBe(true);
  });

  it('will use the value of addButtonText as custom text on the New Row button', () => {
    const wrapper = shallow(
      <InlineEditableTableContents {...requiredParams} addButtonText="Add a new row custom text" />
    );
    expect(
      wrapper.find('[data-test-subj="inlineEditableTableActionButton"]').children().text()
    ).toEqual('Add a new row custom text');
  });

  describe('when a user is editing an unsaved item', () => {
    beforeEach(() => setMockValues({ ...mockValues, isEditingUnsavedItem: true }));

    it('will change the displayed items to END with an empty item', () => {
      const wrapper = shallow(<InlineEditableTableContents {...requiredParams} items={items} />);
      expect(wrapper.find(ReorderableTable).prop('items')).toEqual([...items, { id: null }]);
    });

    it('will change the displayed items to START with an empty item when there are uneditableItems', () => {
      const wrapper = shallow(
        <InlineEditableTableContents
          {...requiredParams}
          items={items}
          uneditableItems={[{ id: 3 }]}
        />
      );

      expect(wrapper.find(ReorderableTable).prop('items')).toEqual([{ id: null }, ...items]);
    });
  });

  it('will style the row that is currently being edited', () => {
    setMockValues({ ...mockValues, isEditing: true, editingItemId: 2 });
    const itemList = [{ id: 1 }, { id: 2 }];
    const wrapper = shallow(<InlineEditableTableContents {...requiredParams} items={itemList} />);
    const rowProps = wrapper.find(ReorderableTable).prop('rowProps') as (item: any) => object;
    expect(rowProps(items[0])).toEqual({ className: '' });
    // Since editingItemId is 2 and the second item (position 1) in item list has an id of 2, it gets this class
    expect(rowProps(items[1])).toEqual({ className: 'is-being-edited' });
  });

  it('will pass errors for row that is currently being edited', () => {
    setMockValues({
      ...mockValues,
      isEditing: true,
      editingItemId: 2,
      rowErrors: ['first error', 'second error'],
    });
    const itemList = [{ id: 1 }, { id: 2 }];
    const wrapper = shallow(<InlineEditableTableContents {...requiredParams} items={itemList} />);
    const rowErrors = wrapper.find(ReorderableTable).prop('rowErrors') as (item: any) => object;
    expect(rowErrors(items[0])).toEqual(undefined);
    // Since editingItemId is 2 and the second item (position 1) in item list has an id of 2, it gets the errors
    expect(rowErrors(items[1])).toEqual(['first error', 'second error']);
  });

  it('will update the passed columns and pass them through to the underlying table', () => {
    const updatedColumns = {};
    const canRemoveLastItem = true;
    const isLoading = true;
    const lastItemWarning = 'A warning';
    const uneditableItems: Foo[] = [];

    (getUpdatedColumns as jest.Mock).mockReturnValue(updatedColumns);
    const wrapper = shallow(
      <InlineEditableTableContents
        {...requiredParams}
        canRemoveLastItem={canRemoveLastItem}
        isLoading={isLoading}
        lastItemWarning={lastItemWarning}
        uneditableItems={uneditableItems}
      />
    );
    const columns = wrapper.find(ReorderableTable).prop('columns');
    expect(columns).toEqual(updatedColumns);

    expect(getUpdatedColumns).toHaveBeenCalledWith({
      columns: requiredParams.columns,
      displayedItems: items,
      isActivelyEditing: expect.any(Function),
      canRemoveLastItem,
      isLoading,
      lastItemWarning,
      uneditableItems,
    });
  });
});
