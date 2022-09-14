/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useReducer, useMemo, useCallback } from 'react';
import { RuleTableItem } from '../../types';

interface BulkEditSelectionState {
  selectedIds: Set<string>;
  isAllSelected: boolean;
}

enum ActionTypes {
  TOGGLE_SELECT_ALL = 'TOGGLE_SELECT_ALL',
  TOGGLE_ROW = 'TOGGLE_ROW',
  SET_SELECTION = 'SET_SELECTION',
  CLEAR_SELECTION = 'CLEAR_SELECTION',
}

interface Action {
  type: ActionTypes;
  payload?: string | string[] | boolean;
}

const initialState: BulkEditSelectionState = {
  selectedIds: new Set<string>(),
  isAllSelected: false,
};

const reducer = (state: BulkEditSelectionState, action: Action) => {
  const { type, payload } = action;
  switch (type) {
    case ActionTypes.TOGGLE_SELECT_ALL:
      return {
        ...state,
        isAllSelected: !state.isAllSelected,
        selectedIds: new Set<string>(),
      };
    case ActionTypes.TOGGLE_ROW: {
      const id = payload as string;
      if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
      } else {
        state.selectedIds.add(id);
      }
      return {
        ...state,
        selectedIds: new Set<string>(state.selectedIds),
      };
    }
    case ActionTypes.SET_SELECTION: {
      const selectedIds = payload as string[];
      return {
        ...state,
        selectedIds: new Set<string>(selectedIds),
      };
    }
    case ActionTypes.CLEAR_SELECTION: {
      return {
        ...initialState,
        selectedIds: new Set<string>(),
      };
    }
    default:
      return state;
  }
};

interface UseRulesBulkEditSelectProps {
  totalItemCount: number;
  itemIds: string[];
}

export function useRulesBulkEditSelect({
  totalItemCount = 0,
  itemIds = [],
}: UseRulesBulkEditSelectProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const numberOfSelectedItems = useMemo(() => {
    const { selectedIds, isAllSelected } = state;
    if (!totalItemCount) {
      return 0;
    }
    if (isAllSelected) {
      return totalItemCount - selectedIds.size;
    }
    return selectedIds.size;
  }, [state, totalItemCount]);

  const isPageSelected = useMemo(() => {
    const { selectedIds, isAllSelected } = state;
    return itemIds.every((id) => {
      if (isAllSelected) {
        return !selectedIds.has(id);
      }
      return selectedIds.has(id);
    });
  }, [state, itemIds]);

  const isRowSelected = useCallback(
    (rule: RuleTableItem) => {
      const { selectedIds, isAllSelected } = state;
      if (isAllSelected) {
        return !selectedIds.has(rule.id);
      }
      return selectedIds.has(rule.id);
    },
    [state]
  );

  const onSelectRow = useCallback((rule: RuleTableItem) => {
    dispatch({ type: ActionTypes.TOGGLE_ROW, payload: rule.id });
  }, []);

  const onSelectAll = useCallback(() => {
    dispatch({ type: ActionTypes.TOGGLE_SELECT_ALL, payload: !state.isAllSelected });
  }, [state]);

  const onSelectPage = useCallback(() => {
    const { selectedIds, isAllSelected } = state;
    if ((isPageSelected && isAllSelected) || (!isPageSelected && !isAllSelected)) {
      dispatch({ type: ActionTypes.SET_SELECTION, payload: [...selectedIds, ...itemIds] });
    }
    if ((isPageSelected && !isAllSelected) || (!isPageSelected && isAllSelected)) {
      itemIds.forEach((id) => {
        selectedIds.delete(id);
      });
      dispatch({ type: ActionTypes.SET_SELECTION, payload: [...selectedIds] });
    }
  }, [state, isPageSelected, itemIds]);

  const onClearSelection = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_SELECTION });
  }, []);

  const getFilter = useCallback(() => {
    const { selectedIds, isAllSelected } = state;
    const idsArray = [...selectedIds];

    if (isAllSelected) {
      if (idsArray.length === 0) {
        return 'alert.id: *';
      }
      return `NOT (${idsArray.map((id) => `alert.id: "alert:${id}"`).join(' or ')})`;
    }
    return '';
  }, [state]);

  return useMemo(() => {
    return {
      selectedIds: state.selectedIds,
      isAllSelected: state.isAllSelected,
      isPageSelected,
      numberOfSelectedItems,
      isRowSelected,
      getFilter,
      onSelectRow,
      onSelectAll,
      onSelectPage,
      onClearSelection,
    };
  }, [
    state,
    isPageSelected,
    numberOfSelectedItems,
    isRowSelected,
    getFilter,
    onSelectRow,
    onSelectAll,
    onSelectPage,
    onClearSelection,
  ]);
}
