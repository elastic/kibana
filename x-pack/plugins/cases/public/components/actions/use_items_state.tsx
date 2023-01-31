/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption, IconType } from '@elastic/eui';
import { assertNever } from '@elastic/eui';
import { useCallback, useReducer, useMemo } from 'react';
import type { Case } from '../../../common';
import type { ItemSelectableOption, ItemsSelectionState } from './types';

interface UseItemsStateProps {
  items: string[];
  selectedCases: Case[];
  itemToSelectableOption: <T>(item: Payload[number]) => EuiSelectableOption<T>;
  fieldSelector: (theCase: Case) => string[];
  onChangeItems: (args: ItemsSelectionState) => void;
}

enum ItemState {
  CHECKED = 'checked',
  PARTIAL = 'partial',
  UNCHECKED = 'unchecked',
}

export enum Actions {
  CHECK_ITEM,
  UNCHECK_ITEM,
  SET_NEW_STATE,
}

enum ICONS {
  CHECKED = 'check',
  PARTIAL = 'asterisk',
  UNCHECKED = 'empty',
}

type Payload = Array<Pick<Item, 'key' | 'data'>>;
type Action =
  | { type: Actions.CHECK_ITEM; payload: Payload }
  | { type: Actions.UNCHECK_ITEM; payload: Payload }
  | { type: Actions.SET_NEW_STATE; payload: State };

interface Item {
  key: string;
  itemState: ItemState;
  dirty: boolean;
  icon: IconType;
  data: Record<string, unknown>;
}

interface State {
  items: Record<string, Item>;
  itemCounterMap: Map<string, number>;
}

const stateToIconMap: Record<ItemState, ICONS> = {
  [ItemState.CHECKED]: ICONS.CHECKED,
  [ItemState.PARTIAL]: ICONS.PARTIAL,
  [ItemState.UNCHECKED]: ICONS.UNCHECKED,
};

/**
 * The EuiSelectable has two states values for its items: checked="on" for checked items
 * and check=undefined for unchecked items. Given that our use case needs
 * to track items that are part in some cases and not part in some others we need
 * to keep our own state and sync it with the EuiSelectable. Our state is always
 * the source of true.
 *
 * In our state, a item can be in one of the following states: checked, partial, and unchecked.
 * A checked item is a item that is either common in all cases or has been
 * checked by the user. A partial item is a item that is available is some of the
 * selected cases and not available in others. A user can not make a item partial.
 * A unchecked item is a item that is either unselected by the user or is not available
 * in all selected cases.
 *
 * State transitions:
 *
 * partial --> checked
 * checked --> unchecked
 * unchecked --> checked
 *
 * A dirty item is a item that the user clicked. Because the EuiSelectable
 * returns all items (items) on each user interaction we need to distinguish items
 * that the user unselected from items that are not common between all selected cases
 * and the user did not interact with them. Marking items as dirty help us to do that.
 * A user to unselect a item needs to fist checked a partial or an unselected item and make it
 * selected (and dirty). This guarantees that unchecked items will always become dirty at some
 * point in the past.
 *
 * On mount (initial state) the component gets all available items.
 * The items that are common in all selected cases are marked as checked
 * and dirty in our state and checked in EuiSelectable state.
 * The ones that are not common in any of the selected items are
 * marked as unchecked and not dirty in our state and unchecked in EuiSelectable state.
 * The items that are common in some of the cases are marked as partial and not dirty
 * in our state and unchecked in EuiSelectable state.
 *
 * When a user interacts with a item the following happens:
 * a) If the item is unchecked the EuiSelectable marks it as checked and
 * we change the state of the item as checked and dirty.
 * b) If the item is partial the EuiSelectable marks it as checked and
 * we change the state of the item as checked and dirty.
 * c) If the item is checked the EuiSelectable marks it as unchecked and
 * we change the state of the item as unchecked and dirty.
 */

const itemsReducer: React.Reducer<State, Action> = (state: State, action): State => {
  switch (action.type) {
    case Actions.CHECK_ITEM:
      const selectedItems: State['items'] = {};

      for (const item of action.payload) {
        selectedItems[item.key] = {
          key: item.key,
          itemState: ItemState.CHECKED,
          dirty: true,
          icon: ICONS.CHECKED,
          data: item.data,
        };
      }

      return { ...state, items: { ...state.items, ...selectedItems } };

    case Actions.UNCHECK_ITEM:
      const unSelectedItems: State['items'] = {};

      for (const item of action.payload) {
        unSelectedItems[item.key] = {
          key: item.key,
          itemState: ItemState.UNCHECKED,
          dirty: true,
          icon: ICONS.UNCHECKED,
          data: item.data,
        };
      }

      return { ...state, items: { ...state.items, ...unSelectedItems } };

    case Actions.SET_NEW_STATE:
      return { ...action.payload };

    default:
      assertNever(action);
  }
};

const getInitialItemsState = ({
  items,
  selectedCases,
  fieldSelector,
}: {
  items: string[];
  selectedCases: Case[];
  fieldSelector: UseItemsStateProps['fieldSelector'];
}): State => {
  const itemCounterMap = createItemsCounterMapping({ selectedCases, fieldSelector });
  const totalCases = selectedCases.length;
  const itemsRecord: State['items'] = {};
  const state = { items: itemsRecord, itemCounterMap };

  for (const item of items) {
    const itemsCounter = itemCounterMap.get(item) ?? 0;
    const isCheckedItem = itemsCounter === totalCases;
    const isPartialItem = itemsCounter < totalCases && itemsCounter !== 0;
    const itemState = isCheckedItem
      ? ItemState.CHECKED
      : isPartialItem
      ? ItemState.PARTIAL
      : ItemState.UNCHECKED;

    const icon = getSelectionIcon(itemState);

    itemsRecord[item] = { key: item, itemState, dirty: isCheckedItem, icon, data: {} };
  }

  return state;
};

const createItemsCounterMapping = ({
  selectedCases,
  fieldSelector,
}: {
  selectedCases: Case[];
  fieldSelector: UseItemsStateProps['fieldSelector'];
}) => {
  const counterMap = new Map<string, number>();

  for (const theCase of selectedCases) {
    const items = fieldSelector(theCase);

    for (const item of items) {
      counterMap.set(item, (counterMap.get(item) ?? 0) + 1);
    }
  }

  return counterMap;
};

const getSelectionIcon = (itemState: ItemState): ICONS => {
  return stateToIconMap[itemState];
};

export const getSelectedAndUnselectedItems = (
  newOptions: ItemSelectableOption[],
  items: State['items']
) => {
  const selectedItems: Payload = [];
  const unSelectedItems: Payload = [];

  for (const option of newOptions) {
    if (option.checked === 'on') {
      selectedItems.push({ key: option.key, data: option.data ?? {} });
    }

    /**
     * User can only select the "Add new item" item. Because a new item do not have a state yet
     * we need to ensure that state access is done only by options with state.
     */
    if (!option.data?.newItem && !option.checked && items[option.key] && items[option.key].dirty) {
      unSelectedItems.push({ key: option.key, data: option.data ?? {} });
    }
  }

  return { selectedItems, unSelectedItems };
};

const getKeysFromPayload = (items: Payload): string[] => items.map((item) => item.key);

const stateToPayload = (items: State['items']): Payload =>
  Object.keys(items).map((key) => ({ key, data: items[key].data }));

export const useItemsState = ({
  items,
  selectedCases,
  fieldSelector,
  itemToSelectableOption,
  onChangeItems,
}: UseItemsStateProps) => {
  /**
   * If react query refetch on the background and fetches new items the component will
   * rerender but it will not change the state. getInitialItemsState will run only on
   * mount. This is a desired behaviour because it prevents the list of items for changing
   * while the user interacts with the selectable.
   */

  const [state, dispatch] = useReducer(
    itemsReducer,
    { items, selectedCases, fieldSelector },
    getInitialItemsState
  );

  const stateToOptions = useCallback((): ItemSelectableOption[] => {
    const itemsKeys = Object.keys(state.items);

    return itemsKeys.map((key): EuiSelectableOption => {
      const convertedItem = itemToSelectableOption({ key, data: state.items[key].data });

      return {
        key,
        ...(state.items[key].itemState === ItemState.CHECKED ? { checked: 'on' } : {}),
        'data-test-subj': `cases-actions-items-edit-selectable-item-${key}`,
        ...convertedItem,
        label: convertedItem.label ?? key,
        data: { ...convertedItem?.data, itemIcon: state.items[key].icon },
      };
    }) as ItemSelectableOption[];
  }, [state.items, itemToSelectableOption]);

  const onChange = useCallback(
    (newOptions: ItemSelectableOption[]) => {
      /**
       * In this function the user has selected and deselected some items. If the user
       * pressed the "add new item" option it means that needs to add the new item to the list.
       * Because the label of the "add new item" item is "Add ${searchValue} as a item" we need to
       * change the label to the same as the item the user entered. The key will always be the
       * search term (aka the new label).
       */
      const normalizeOptions = newOptions.map((option) => {
        if (option.data?.newItem) {
          return {
            ...option,
            label: option.key ?? '',
          };
        }

        return option;
      });

      const { selectedItems, unSelectedItems } = getSelectedAndUnselectedItems(
        normalizeOptions,
        state.items
      );

      dispatch({ type: Actions.CHECK_ITEM, payload: selectedItems });
      dispatch({ type: Actions.UNCHECK_ITEM, payload: unSelectedItems });
      onChangeItems({
        selectedItems: getKeysFromPayload(selectedItems),
        unSelectedItems: getKeysFromPayload(unSelectedItems),
      });
    },
    [onChangeItems, state.items]
  );

  const onSelectAll = useCallback(() => {
    dispatch({ type: Actions.CHECK_ITEM, payload: stateToPayload(state.items) });
    onChangeItems({ selectedItems: Object.keys(state.items), unSelectedItems: [] });
  }, [onChangeItems, state.items]);

  const onSelectNone = useCallback(() => {
    const unSelectedItems: Payload = [];

    for (const [id, item] of Object.entries(state.items)) {
      if (item.itemState === ItemState.CHECKED || item.itemState === ItemState.PARTIAL) {
        unSelectedItems.push({ key: id, data: item.data });
      }
    }

    dispatch({ type: Actions.UNCHECK_ITEM, payload: unSelectedItems });
    onChangeItems({ selectedItems: [], unSelectedItems: getKeysFromPayload(unSelectedItems) });
  }, [state.items, onChangeItems]);

  const options: ItemSelectableOption[] = useMemo(() => stateToOptions(), [stateToOptions]);

  const totalSelectedItems = Object.values(state.items).filter(
    (item) => item.itemState === ItemState.CHECKED || item.itemState === ItemState.PARTIAL
  ).length;

  const resetItems = useCallback(
    (newItems: string[]) => {
      const newState = getInitialItemsState({ items: newItems, selectedCases, fieldSelector });
      dispatch({ type: Actions.SET_NEW_STATE, payload: newState });
    },
    [fieldSelector, selectedCases]
  );

  return useMemo(
    () => ({
      state,
      options,
      totalSelectedItems,
      onChange,
      onSelectAll,
      onSelectNone,
      resetItems,
    }),
    [onChange, onSelectAll, onSelectNone, options, resetItems, state, totalSelectedItems]
  );
};

export type UseItemsState = ReturnType<typeof useItemsState>;
