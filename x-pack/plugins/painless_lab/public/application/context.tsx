/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, ReactNode, useState, useContext } from 'react';

import { initialState, Store } from './store';
import { PAINLESS_LAB_KEY } from './constants';

interface ContextValue {
  state: Store;
  setState: (nextState: (s: Store) => Store) => void;
}

const AppContext = createContext<ContextValue>(undefined as any);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<Store>(() => ({
    ...initialState,
    ...JSON.parse(localStorage.getItem(PAINLESS_LAB_KEY) || '{}'),
  }));

  const wrappedSetState = (nextState: (s: Store) => Store): void => {
    localStorage.setItem(PAINLESS_LAB_KEY, JSON.stringify(state));
    setState(() => nextState(state));
  };
  return (
    <AppContext.Provider value={{ setState: wrappedSetState, state }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('AppContext can only be used inside of AppContextProvider!');
  }
  return ctx;
};
