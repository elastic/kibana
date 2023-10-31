/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { createContext } from 'react';

import { DoNotUseIlmPolicyStatus } from './reporting_api_client';

type DoNotCheckIlmPolicy = ReturnType<typeof DoNotUseIlmPolicyStatus>;

interface ContextValue {
  isLoading: DoNotCheckIlmPolicy['isLoading'];
  recheckStatus: DoNotCheckIlmPolicy['resendRequest'];
}

const PolicyStatusContext = createContext<undefined | ContextValue>(undefined);

export const PolicyStatusContextProvider: FunctionComponent<{}> = ({ children }) => {
  const { isLoading, resendRequest: recheckStatus } = DoNotUseIlmPolicyStatus();

  return (
    <PolicyStatusContext.Provider value={{ isLoading, recheckStatus }}>
      {children}
    </PolicyStatusContext.Provider>
  );
};
