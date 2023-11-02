/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, FunctionComponent } from 'react';
import { DoNotCheckIlmPolicyStatus } from './reporting_api_client';

type DoNotCheckIlmPolicy = ReturnType<typeof DoNotCheckIlmPolicyStatus>;

interface ContextValue {
  recheckStatus: DoNotCheckIlmPolicy['resendRequest'];
}

const PolicyStatusContext = createContext<undefined | ContextValue>(undefined);

export const PolicyStatusContextProvider: FunctionComponent = ({ children }) => {
  const { resendRequest: recheckStatus } = DoNotCheckIlmPolicyStatus();

  return (
    <PolicyStatusContext.Provider value={{ recheckStatus }}>
      {children}
    </PolicyStatusContext.Provider>
  );
};

export type UseDefaultPolicyStatusReturn = ReturnType<typeof useDefaultPolicyStatus>;

export const useDefaultPolicyStatus = (): ContextValue => {
  const ctx = useContext(PolicyStatusContext);
  if (!ctx) {
    throw new Error('"PolicyStatus" can only be used inside of "PolicyStatusContext"');
  }
  return ctx;
};
