/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactChild, useContext, useCallback, useState } from 'react';
import { cloneDeep, get, set } from 'lodash';

import { SerializedPolicy, RollupAction } from '../../../../common/types';

export interface RollupFormContextValue {
  getCurrent: () => RollupFormConfig;
  setCurrent: (
    rollupConfig: RollupFormConfig | ((rollupConfig: RollupFormConfig) => RollupFormConfig)
  ) => void;
  addRollupConfigToPolicy: (policy: SerializedPolicy) => SerializedPolicy;
}

interface RollupFormConfig {
  hot: {
    enabled: boolean;
    action: RollupAction;
  };
  cold: {
    enabled: boolean;
    action: RollupAction;
  };
}

const RollupFormContext = createContext<RollupFormContextValue>(null as any);

const hotRollupActionPath = 'phases.hot.actions.rollup';
const coldRollupActionPath = 'phases.cold.actions.rollup';

interface Props {
  policy: SerializedPolicy;
  children: ReactChild;
}

export const RollupFormContextProvider = ({ policy, children }: Props) => {
  const [rollupForm, setRollupForm] = useState<RollupFormConfig>(() => {
    const hotConfig = get(policy, hotRollupActionPath);
    const coldConfig = get(policy, coldRollupActionPath);
    return {
      hot: {
        enabled: Boolean(hotConfig),
        action: hotConfig,
      },
      cold: {
        enabled: Boolean(coldConfig),
        action: coldConfig,
      },
    };
  });

  const getCurrentRollupAction = useCallback(() => rollupForm, [rollupForm]);

  const addRollupConfigToPolicy = useCallback(
    (value: SerializedPolicy) => {
      const newPolicy = cloneDeep(value);
      set(
        newPolicy,
        hotRollupActionPath,
        rollupForm.hot.enabled ? rollupForm.hot.action : undefined
      );
      set(
        newPolicy,
        coldRollupActionPath,
        rollupForm.cold.enabled ? rollupForm.cold.action : undefined
      );
      return newPolicy;
    },
    [rollupForm]
  );

  return (
    <RollupFormContext.Provider
      value={{
        addRollupConfigToPolicy,
        getCurrent: getCurrentRollupAction,
        setCurrent: setRollupForm,
      }}
    >
      {children}
    </RollupFormContext.Provider>
  );
};

export const useRollupFormContext = (): RollupFormContextValue => {
  const ctx = useContext(RollupFormContext);
  if (!ctx) {
    throw new Error('useRollupFormContext can only be called inside of RollupFormContext!');
  }
  return ctx;
};
