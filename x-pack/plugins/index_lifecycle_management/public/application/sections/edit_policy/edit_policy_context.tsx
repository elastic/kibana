/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import React, { createContext, ReactChild, useContext, useRef, useCallback, useMemo } from 'react';
import qs from 'query-string';
import { get } from 'lodash';
import { ApplicationStart } from 'kibana/public';

import { PolicyFromES, SerializedPolicy, RollupAction } from '../../../../common/types';

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

interface PolicyRollupConfig {
  hot: {
    enabled: boolean;
    action: RollupAction;
  };
  cold: {
    enabled: boolean;
    action: RollupAction;
  };
}

interface InternalEditPolicyContextValue extends EditPolicyContextValue {
  currentView: PolicyView;
  rollup: {
    getCurrent: () => PolicyRollupConfig;
    setCurrent: (rollupConfig: PolicyRollupConfig) => void;
  };
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
  const hotConfig = get(value.policy, 'phases.hot.actions.rollup');
  const coldConfig = get(value.policy, 'phases.cold.actions.rollup');
  const rollupActionRef = useRef<PolicyRollupConfig>({
    hot: {
      enabled: Boolean(hotConfig),
      action: hotConfig,
    },
    cold: {
      enabled: Boolean(coldConfig),
      action: coldConfig,
    },
  });
  const currentView = useMemo<PolicyView>(() => {
    const { rollup } = qs.parse(search) as { rollup: 'hot' | 'cold' };
    if (rollup) {
      return { id: 'rollupAction', phase: rollup };
    }
    return { id: 'policy' };
  }, [search]);

  const getCurrentRollupAction = useCallback(() => rollupActionRef.current, []);
  const setCurrentRollupAction = useCallback((policyRollupConfig: PolicyRollupConfig) => {
    rollupActionRef.current = policyRollupConfig;
  }, []);

  return (
    <EditPolicyContext.Provider
      value={{
        ...value,
        currentView,
        rollup: { getCurrent: getCurrentRollupAction, setCurrent: setCurrentRollupAction },
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
