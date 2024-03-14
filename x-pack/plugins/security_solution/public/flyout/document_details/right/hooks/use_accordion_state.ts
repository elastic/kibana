/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch } from 'react';
import { useReducer } from 'react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { FLYOUT_STORAGE_KEYS } from '../../shared/constants/local_storage';

const CLOSED = 'closed' as const;
const OPEN = 'open' as const;
type ToggleReducerState = typeof CLOSED | typeof OPEN;

export interface ToggleReducerAction {
  /**
   * From useKibana().services.storage
   */
  storage: Storage | undefined;
  /**
   * Key to store in local storage
   */
  localStorageKey: string | undefined;
}

/**
 * Reducer for toggling between expanded and collapsed states.
 * Every time the user takes an action, we store the new state in local storage. This allows to preserve the state when opening new flyouts or when refreshing the page.
 * The object stored is a map of section names to expanded boolean values.
 */
export const toggleReducer = (state: ToggleReducerState, action: ToggleReducerAction) => {
  const { storage, localStorageKey } = action;
  if (storage && localStorageKey) {
    const localStorage = storage.get(FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS);
    storage.set(FLYOUT_STORAGE_KEYS.OVERVIEW_TAB_EXPANDED_SECTIONS, {
      ...localStorage,
      [localStorageKey]: state !== OPEN,
    });
  }

  return state === CLOSED ? OPEN : CLOSED;
};

export interface UseAccordionStateValue {
  /**
   * Should children be rendered in the dom
   */
  renderContent: boolean;
  /**
   * Use this to control the accordion visual state
   */
  state: ToggleReducerState;

  /**
   * Handler function for cycling between the states
   */
  toggle: Dispatch<ToggleReducerAction>;
}

/**
 * Hook to control the state of the EuiAccordion. It will store the state in local storage if the localStorageKey is provided.
 * @param expandedInitially - is accordion expanded on first render
 */
export const useAccordionState = (expandedInitially: boolean): UseAccordionStateValue => {
  const initialState = expandedInitially ? OPEN : CLOSED;
  const [state, toggle] = useReducer(toggleReducer, initialState);
  const renderContent = state === OPEN;

  return {
    renderContent,
    state,
    toggle,
  };
};
