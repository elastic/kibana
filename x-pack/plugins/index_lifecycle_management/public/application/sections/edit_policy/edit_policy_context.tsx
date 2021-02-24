/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import React, { createContext, ReactChild, useContext, useMemo } from 'react';
import qs from 'query-string';
import { ApplicationStart } from 'kibana/public';

import { PolicyFromES, SerializedPolicy } from '../../../../common/types';

type PolicyView = { id: 'policy' } | { id: 'rollupAction'; phase: 'hot' | 'cold' };

export interface EditPolicyContextValue {
  isNewPolicy: boolean;
  policy: SerializedPolicy;
  existingPolicies: PolicyFromES[];
  getUrlForApp: ApplicationStart['getUrlForApp'];
  license: {
    canUseSearchableSnapshot: () => boolean;
  };
  policyName?: string;
}

interface InternalEditPolicyContextValue extends EditPolicyContextValue {
  currentView: PolicyView;
}

const EditPolicyContext = createContext<InternalEditPolicyContextValue>(null as any);

export const EditPolicyContextProvider = ({
  value,
  children,
}: {
  value: EditPolicyContextValue;
  children: ReactChild;
}) => {
  const { search } = useLocation();
  const currentView = useMemo<PolicyView>(() => {
    const { rollup } = qs.parse(search) as { rollup: 'hot' | 'cold' };
    if (rollup) {
      return { id: 'rollupAction', phase: rollup };
    }
    return { id: 'policy' };
  }, [search]);

  return (
    <EditPolicyContext.Provider
      value={{
        ...value,
        currentView,
      }}
    >
      {children}
    </EditPolicyContext.Provider>
  );
};

export const useEditPolicyContext = (): InternalEditPolicyContextValue => {
  const ctx = useContext(EditPolicyContext);
  if (!ctx) {
    throw new Error('useEditPolicyContext can only be called inside of EditPolicyContext!');
  }
  return ctx;
};
