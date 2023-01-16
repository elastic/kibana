/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { act, renderHook } from '@testing-library/react-hooks';
import { useItemsState } from './use_items_state';

import { basicCase } from '../../containers/mock';
import type { ItemSelectableOption } from './types';

describe('useItemsState', () => {
  let appMockRender: AppMockRenderer;
  const onChangeItems = jest.fn();
  const fieldSelector = jest.fn();
  const itemToSelectableOption = jest
    .fn()
    .mockImplementation((item) => ({ key: item.key, label: item.key, data: item.data }));

  const props = {
    items: ['one', 'two', 'three', 'four'],
    selectedCases: [basicCase, basicCase],
    fieldSelector,
    itemToSelectableOption,
    onChangeItems,
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    fieldSelector.mockReturnValueOnce(['one', 'two']);
    fieldSelector.mockReturnValueOnce(['one', 'three']);
    jest.clearAllMocks();
  });

  it('inits the state correctly', async () => {
    const { result } = renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current.state).toMatchInlineSnapshot(`
      Object {
        "itemCounterMap": Map {
          "one" => 2,
          "two" => 1,
          "three" => 1,
        },
        "items": Object {
          "four": Object {
            "data": Object {},
            "dirty": false,
            "icon": "empty",
            "itemState": "unchecked",
            "key": "four",
          },
          "one": Object {
            "data": Object {},
            "dirty": true,
            "icon": "check",
            "itemState": "checked",
            "key": "one",
          },
          "three": Object {
            "data": Object {},
            "dirty": false,
            "icon": "asterisk",
            "itemState": "partial",
            "key": "three",
          },
          "two": Object {
            "data": Object {},
            "dirty": false,
            "icon": "asterisk",
            "itemState": "partial",
            "key": "two",
          },
        },
      }
    `);
  });

  it('inits the options correctly', async () => {
    const { result } = renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current.options).toMatchInlineSnapshot(`
      Array [
        Object {
          "checked": "on",
          "data": Object {
            "itemIcon": "check",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-one",
          "key": "one",
          "label": "one",
        },
        Object {
          "data": Object {
            "itemIcon": "asterisk",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-two",
          "key": "two",
          "label": "two",
        },
        Object {
          "data": Object {
            "itemIcon": "asterisk",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-three",
          "key": "three",
          "label": "three",
        },
        Object {
          "data": Object {
            "itemIcon": "empty",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-four",
          "key": "four",
          "label": "four",
        },
      ]
    `);
  });

  it('inits the totalSelectedItems correctly', async () => {
    const { result } = renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current.totalSelectedItems).toBe(3);
  });

  it('selects all items correctly', async () => {
    const { result } = renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.onSelectAll();
    });

    expect(result.current.totalSelectedItems).toBe(4);

    expect(result.current.state).toMatchInlineSnapshot(`
      Object {
        "itemCounterMap": Map {
          "one" => 2,
          "two" => 1,
          "three" => 1,
        },
        "items": Object {
          "four": Object {
            "data": Object {},
            "dirty": true,
            "icon": "check",
            "itemState": "checked",
            "key": "four",
          },
          "one": Object {
            "data": Object {},
            "dirty": true,
            "icon": "check",
            "itemState": "checked",
            "key": "one",
          },
          "three": Object {
            "data": Object {},
            "dirty": true,
            "icon": "check",
            "itemState": "checked",
            "key": "three",
          },
          "two": Object {
            "data": Object {},
            "dirty": true,
            "icon": "check",
            "itemState": "checked",
            "key": "two",
          },
        },
      }
    `);

    expect(result.current.options).toMatchInlineSnapshot(`
      Array [
        Object {
          "checked": "on",
          "data": Object {
            "itemIcon": "check",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-one",
          "key": "one",
          "label": "one",
        },
        Object {
          "checked": "on",
          "data": Object {
            "itemIcon": "check",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-two",
          "key": "two",
          "label": "two",
        },
        Object {
          "checked": "on",
          "data": Object {
            "itemIcon": "check",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-three",
          "key": "three",
          "label": "three",
        },
        Object {
          "checked": "on",
          "data": Object {
            "itemIcon": "check",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-four",
          "key": "four",
          "label": "four",
        },
      ]
    `);

    expect(onChangeItems).toHaveBeenCalledWith({
      selectedItems: ['one', 'two', 'three', 'four'],
      unSelectedItems: [],
    });
  });

  it('unselects all items correctly', async () => {
    const { result } = renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.onSelectNone();
    });

    expect(result.current.totalSelectedItems).toBe(0);

    expect(result.current.state).toMatchInlineSnapshot(`
      Object {
        "itemCounterMap": Map {
          "one" => 2,
          "two" => 1,
          "three" => 1,
        },
        "items": Object {
          "four": Object {
            "data": Object {},
            "dirty": false,
            "icon": "empty",
            "itemState": "unchecked",
            "key": "four",
          },
          "one": Object {
            "data": Object {},
            "dirty": true,
            "icon": "empty",
            "itemState": "unchecked",
            "key": "one",
          },
          "three": Object {
            "data": Object {},
            "dirty": true,
            "icon": "empty",
            "itemState": "unchecked",
            "key": "three",
          },
          "two": Object {
            "data": Object {},
            "dirty": true,
            "icon": "empty",
            "itemState": "unchecked",
            "key": "two",
          },
        },
      }
    `);

    expect(result.current.options).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "itemIcon": "empty",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-one",
          "key": "one",
          "label": "one",
        },
        Object {
          "data": Object {
            "itemIcon": "empty",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-two",
          "key": "two",
          "label": "two",
        },
        Object {
          "data": Object {
            "itemIcon": "empty",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-three",
          "key": "three",
          "label": "three",
        },
        Object {
          "data": Object {
            "itemIcon": "empty",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-four",
          "key": "four",
          "label": "four",
        },
      ]
    `);

    expect(onChangeItems).toHaveBeenCalledWith({
      selectedItems: [],
      unSelectedItems: ['one', 'two', 'three'],
    });
  });

  it('selects and unselects correctly', async () => {
    const { result } = renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    const newOptions = [
      { key: 'one', label: 'one' },
      { checked: 'on', key: 'two', label: 'two' },
      { checked: 'on', key: 'four', label: 'four' },
    ] as ItemSelectableOption[];

    act(() => {
      result.current.onChange(newOptions);
    });

    expect(result.current.totalSelectedItems).toBe(3);

    expect(result.current.state).toMatchInlineSnapshot(`
      Object {
        "itemCounterMap": Map {
          "one" => 2,
          "two" => 1,
          "three" => 1,
        },
        "items": Object {
          "four": Object {
            "data": Object {},
            "dirty": true,
            "icon": "check",
            "itemState": "checked",
            "key": "four",
          },
          "one": Object {
            "data": Object {},
            "dirty": true,
            "icon": "empty",
            "itemState": "unchecked",
            "key": "one",
          },
          "three": Object {
            "data": Object {},
            "dirty": false,
            "icon": "asterisk",
            "itemState": "partial",
            "key": "three",
          },
          "two": Object {
            "data": Object {},
            "dirty": true,
            "icon": "check",
            "itemState": "checked",
            "key": "two",
          },
        },
      }
    `);

    expect(result.current.options).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "itemIcon": "empty",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-one",
          "key": "one",
          "label": "one",
        },
        Object {
          "checked": "on",
          "data": Object {
            "itemIcon": "check",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-two",
          "key": "two",
          "label": "two",
        },
        Object {
          "data": Object {
            "itemIcon": "asterisk",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-three",
          "key": "three",
          "label": "three",
        },
        Object {
          "checked": "on",
          "data": Object {
            "itemIcon": "check",
          },
          "data-test-subj": "cases-actions-items-edit-selectable-item-four",
          "key": "four",
          "label": "four",
        },
      ]
    `);
  });

  it('changes the label of the new item correctly', async () => {
    const { result } = renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    const newOptions = [
      { key: 'one', label: 'my whatever label', data: { newItem: true } },
      { checked: 'on', key: 'two', label: 'two' },
      { checked: 'on', key: 'four', label: 'four' },
    ] as ItemSelectableOption[];

    act(() => {
      result.current.onChange(newOptions);
    });

    const itemOne = result.current.options.find((item) => item.key === 'one')!;

    expect(itemOne.label).toBe('one');
  });

  it('keeps the data of the option', async () => {
    const { result } = renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    const newOptions = [
      { key: 'one', label: 'one', data: { foo: 'bar' } },
      { key: 'two', label: 'two', checked: 'on', data: { baz: 'qux' } },
      { key: 'three', label: 'three', checked: 'on' },
    ] as ItemSelectableOption[];

    act(() => {
      result.current.onChange(newOptions);
    });

    const itemOne = result.current.state.items.one;
    const itemOneOption = result.current.options.find((item) => item.key === 'one')!;

    const itemTwo = result.current.state.items.two;
    const itemTwoOption = result.current.options.find((item) => item.key === 'two')!;

    expect(itemOne.data).toEqual({ foo: 'bar' });
    expect(itemOneOption.data).toEqual({ foo: 'bar', itemIcon: 'empty' });

    expect(itemTwo.data).toEqual({ baz: 'qux' });
    expect(itemTwoOption.data).toEqual({ baz: 'qux', itemIcon: 'check' });
  });

  it('does not add the new item as unselected', async () => {
    const { result } = renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    const newOptions = [
      { key: 'one', label: 'one', data: { newItem: true } },
      { key: 'two', label: 'two', checked: 'on' },
    ] as ItemSelectableOption[];

    act(() => {
      result.current.onChange(newOptions);
    });

    expect(onChangeItems).toBeCalledWith({
      selectedItems: ['two'],
      unSelectedItems: [],
    });
  });

  it('does not add non dirty items as unselected', async () => {
    const { result } = renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    const newOptions = [{ key: 'two', label: 'two', checked: 'on' }] as ItemSelectableOption[];

    act(() => {
      result.current.onChange(newOptions);
    });

    /**
     * Item four initial state has dirty=false
     * It should not be part of the unSelectedItems
     */
    expect(onChangeItems).toBeCalledWith({
      selectedItems: ['two'],
      unSelectedItems: [],
    });
  });

  it('calls itemToSelectableOption correctly', async () => {
    renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(itemToSelectableOption).toHaveBeenNthCalledWith(1, {
      data: {},
      key: 'one',
    });

    expect(itemToSelectableOption).toHaveBeenNthCalledWith(2, {
      data: {},
      key: 'two',
    });

    expect(itemToSelectableOption).toHaveBeenNthCalledWith(3, {
      data: {},
      key: 'three',
    });
  });

  it('calls itemToSelectableOption with data correctly', async () => {
    const { result } = renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    const newOptions = [
      { key: 'one', label: 'one', data: { foo: 'bar' } },
      { key: 'two', label: 'two', checked: 'on', data: { baz: 'qux' } },
      { key: 'three', label: 'three', checked: 'on' },
    ] as ItemSelectableOption[];

    act(() => {
      result.current.onChange(newOptions);
    });

    expect(itemToSelectableOption).toHaveBeenCalledWith({ key: 'one', data: { foo: 'bar' } });
    expect(itemToSelectableOption).toHaveBeenCalledWith({ key: 'two', data: { baz: 'qux' } });
  });

  it('defaults the label to key if not returned by itemToSelectableOption', async () => {
    itemToSelectableOption.mockImplementation((item) => ({
      key: item.key,
    }));

    const { result } = renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    for (const option of result.current.options) {
      expect(option.label).toBe(option.label);
    }
  });

  it('prevents itemToSelectableOption to override itemIcon', async () => {
    itemToSelectableOption.mockImplementation((item) => ({
      key: item.key,
      data: { itemIcon: 'my-icon' },
    }));

    const validIcons = ['check', 'asterisk', 'empty'];

    const { result } = renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    for (const option of result.current.options) {
      const hasValidIcon = validIcons.some((icon) => icon === option.data?.itemIcon);
      expect(hasValidIcon).toBe(true);
    }
  });

  it('calls fieldSelector correctly', async () => {
    renderHook(() => useItemsState(props), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(fieldSelector).toHaveBeenCalledWith(basicCase);
  });
});
