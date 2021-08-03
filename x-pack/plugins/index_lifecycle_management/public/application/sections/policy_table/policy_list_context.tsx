/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactChild, useContext, useState } from 'react';
import { PolicyFromES } from '../../../../common/types';

interface PolicyAction {
  action: 'viewIndexTemplates' | 'addIndexTemplate' | 'deletePolicy';
  policy: PolicyFromES;
}

export interface PolicyListContextValue {
  policyAction: PolicyAction | null;
  setPolicyAction: (policyAction: PolicyAction | null) => void;
}

const PolicyListContext = createContext<PolicyListContextValue>({
  policyAction: null,
  setPolicyAction: () => {},
});

export const PolicyListContextProvider = ({ children }: { children: ReactChild }) => {
  const [policyAction, setPolicyAction] = useState<PolicyAction | null>(null);

  return (
    <PolicyListContext.Provider
      value={{
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
