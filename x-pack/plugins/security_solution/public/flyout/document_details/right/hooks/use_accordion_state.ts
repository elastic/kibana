/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer } from 'react';

const CLOSED = 'closed' as const;
const OPEN = 'open' as const;

type ToggleReducerState = typeof CLOSED | typeof OPEN;
const toggleReducer = (state: ToggleReducerState) => {
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
  toggle: VoidFunction;
}

/**
 * Tiny hook for controlled AccordionState
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
