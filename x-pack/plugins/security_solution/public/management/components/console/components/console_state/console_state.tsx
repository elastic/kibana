/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  useReducer,
  memo,
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useWithManagedConsoleState } from '../console_manager/console_manager';
import { InitialStateInterface, initiateState, stateDataReducer } from './state_reducer';
import type { ConsoleDataState, ConsoleStore } from './types';

const ConsoleStateContext = createContext<null | ConsoleStore>(null);

type ConsoleStateProviderProps = PropsWithChildren<{}> & InitialStateInterface;

/**
 * A Console wide data store for internal state management between inner components
 */
export const ConsoleStateProvider = memo<ConsoleStateProviderProps>(
  ({ commands, scrollToBottom, keyCapture, HelpComponent, dataTestSubj, managedKey, children }) => {
    const [getConsoleState, storeConsoleState] = useWithManagedConsoleState(managedKey);

    const stateInitializer = useCallback(
      (stateInit: InitialStateInterface): ConsoleDataState => {
        return initiateState(stateInit, getConsoleState ? getConsoleState() : undefined);
      },
      [getConsoleState]
    );

    const [state, dispatch] = useReducer(
      stateDataReducer,
      { commands, scrollToBottom, keyCapture, HelpComponent, dataTestSubj },
      stateInitializer
    );

    // Anytime `state` changes AND the console is under ConsoleManager's control, then
    // store the console's state to ConsoleManager. This is what enables a console to be
    // closed/re-opened while maintaining the console's content
    useEffect(() => {
      if (storeConsoleState) {
        storeConsoleState(state);
      }
    }, [state, storeConsoleState]);

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
