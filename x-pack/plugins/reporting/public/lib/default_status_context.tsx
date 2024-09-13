/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClientConfigType } from '@kbn/reporting-public';
import React, { createContext, FC, PropsWithChildren } from 'react';
import { IlmPolicyStatusContextProvider } from './ilm_policy_status_context';

const PolicyStatusContext = createContext<undefined>(undefined);

interface PolicyStatusContextProviderProps {
  config: ClientConfigType;
}

export const PolicyStatusContextProvider: FC<
  PropsWithChildren<PolicyStatusContextProviderProps>
> = ({ children, ...props }) => {
  return props.config.statefulSettings.enabled ? (
    <IlmPolicyStatusContextProvider>{children}</IlmPolicyStatusContextProvider>
  ) : (
    <PolicyStatusContext.Provider value={undefined}>{children}</PolicyStatusContext.Provider>
  );
};
