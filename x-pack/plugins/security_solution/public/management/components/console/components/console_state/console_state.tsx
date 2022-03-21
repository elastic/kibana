/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, memo, createContext, PropsWithChildren, useContext } from 'react';
import { InitialStateInterface, initiateState, stateDataReducer } from './state_reducer';
import { ConsoleStore } from './types';

const ConsoleStateContext = createContext<null | ConsoleStore>(null);

type ConsoleStateProviderProps = PropsWithChildren<{}> & InitialStateInterface;

/**
 * A Console wide data store for internal state management between inner components
 */
export const ConsoleStateProvider = memo<ConsoleStateProviderProps>(
  ({ commandService, scrollToBottom, dataTestSubj, children }) => {
    const [state, dispatch] = useReducer(
      stateDataReducer,
      { commandService, scrollToBottom, dataTestSubj },
      initiateState
    );

    // FIXME:PT should handle cases where props that are in the store change
    //          Probably need to have a `useAffect()` that just does a `dispatch()` to update those.

    return (
      <ConsoleStateContext.Provider value={{ state, dispatch }}>
        {children}
      </ConsoleStateContext.Provider>
    );
  }
);
ConsoleStateProvider.displayName = 'ConsoleStateProvider';

export const useConsoleStore = (): ConsoleStore => {
  const store = useContext(ConsoleStateContext);

  if (!store) {
    throw new Error(`ConsoleStateContext not defined`);
  }

  return store;
};
