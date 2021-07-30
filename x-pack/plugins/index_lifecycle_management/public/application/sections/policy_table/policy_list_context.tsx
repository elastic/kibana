/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactChild, ReactNode, useContext, useState } from 'react';

export interface PolicyListContextValue {
  updatePolicies: () => void;
  policyAction: ReactNode | null;
  setPolicyAction: (policyAction: ReactNode | null) => void;
}

const PolicyListContext = createContext<PolicyListContextValue>({
  updatePolicies: () => {},
  policyAction: null,
  setPolicyAction: () => {},
});

export const PolicyListContextProvider = ({
  updatePolicies,
  children,
}: {
  updatePolicies: PolicyListContextValue['updatePolicies'];
  children: ReactChild;
}) => {
  const [policyAction, setPolicyAction] = useState<ReactNode | null>();

  return (
    <PolicyListContext.Provider
      value={{
        updatePolicies,
        setPolicyAction,
        policyAction,
      }}
    >
      {children}
    </PolicyListContext.Provider>
  );
};

export const usePolicyListContext = (): PolicyListContextValue => {
  const ctx = useContext(PolicyListContext);
  if (!ctx) {
    throw new Error('usePolicyListContext can only be called inside of PolicyListContext!');
  }
  return ctx;
};
