/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, createContext, useMemo, useRef, useContext } from 'react';

import { SerializedPolicy } from '../../common/types';

interface ContextValue {
  setCurrentPolicy: (policy: SerializedPolicy) => void;
  getCurrentPolicy: () => SerializedPolicy | undefined;
}

const AppContext = createContext<ContextValue>(null as any);

export const AppContextProvider: FunctionComponent = ({ children }) => {
  const currentPolicy = useRef<SerializedPolicy | undefined>();
  const value = useMemo<ContextValue>(() => {
    return {
      getCurrentPolicy: () => currentPolicy.current,
      setCurrentPolicy: (policy) => {
        currentPolicy.current = policy;
      },
    };
  }, []);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext can only be used inside of AppContextProvider');
  }
  return ctx;
};
