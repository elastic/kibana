/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, createContext, useMemo, useRef, useContext } from 'react';

import { SerializedPolicy } from '../../common/types';

interface PolicyData {
  isNewPolicy: boolean;
  policy: SerializedPolicy;
}

export interface AppContextValue {
  setCurrentPolicyData: (policyData: PolicyData) => void;
  getCurrentPolicyData: () => PolicyData | undefined;
  clearCurrentPolicyData: () => void;
}

export const AppContext = createContext<AppContextValue>(null as any);

export const AppContextProvider: FunctionComponent = ({ children }) => {
  const currentPolicyData = useRef<PolicyData | undefined>();
  const value = useMemo<AppContextValue>(() => {
    return {
      getCurrentPolicyData: () => currentPolicyData.current,
      setCurrentPolicyData: (policyData) => {
        currentPolicyData.current = policyData;
      },
      clearCurrentPolicyData: () => {
        currentPolicyData.current = undefined;
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
