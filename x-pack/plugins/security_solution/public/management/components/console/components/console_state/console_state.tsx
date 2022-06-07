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
} from 'react';
import { useWithManagedConsole } from '../console_manager/console_manager';
import { InitialStateInterface, initiateState, stateDataReducer } from './state_reducer';
import { ConsoleStore } from './types';

const ConsoleStateContext = createContext<null | ConsoleStore>(null);

type ConsoleStateProviderProps = PropsWithChildren<{}> & InitialStateInterface;

/**
 * A Console wide data store for internal state management between inner components
 */
export const ConsoleStateProvider = memo<ConsoleStateProviderProps>(
  ({ commands, scrollToBottom, HelpComponent, dataTestSubj, managedKey, children }) => {
    const managedConsole = useWithManagedConsole(managedKey);

    const [state, dispatch] = useReducer(
      stateDataReducer,
      { commands, scrollToBottom, HelpComponent, dataTestSubj },
      (...args) => initiateState(...args, managedConsole?.consoleState)
    );

    useEffect(() => {
      if (managedConsole) {
        managedConsole.consoleState = state;
      }
    }, [managedConsole, state]);

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
