/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { createContext, useContext } from 'react';
import type { IlmPolicyStatusResponse } from '@kbn/reporting-common/types';
import { useCheckIlmPolicyStatus } from '@kbn/reporting-public';

type UseCheckIlmPolicyStatus = ReturnType<typeof useCheckIlmPolicyStatus>;

interface ContextValue {
  status: undefined | IlmPolicyStatusResponse['status'];
  isLoading: UseCheckIlmPolicyStatus['isLoading'];
  recheckStatus: UseCheckIlmPolicyStatus['resendRequest'];
}

const IlmPolicyStatusContext = createContext<undefined | ContextValue>(undefined);

export const IlmPolicyStatusContextProvider: FunctionComponent = ({ children }) => {
  const { isLoading, data, resendRequest: recheckStatus } = useCheckIlmPolicyStatus();

  return (
    <IlmPolicyStatusContext.Provider value={{ isLoading, status: data?.status, recheckStatus }}>
      {children}
    </IlmPolicyStatusContext.Provider>
  );
};

export type UseIlmPolicyStatusReturn = ReturnType<typeof useIlmPolicyStatus>;

export const useIlmPolicyStatus = (): ContextValue => {
  const ctx = useContext(IlmPolicyStatusContext);
  if (!ctx) {
    throw new Error('"useIlmPolicyStatus" can only be used inside of "IlmPolicyStatusContext"');
  }
  return ctx;
};
