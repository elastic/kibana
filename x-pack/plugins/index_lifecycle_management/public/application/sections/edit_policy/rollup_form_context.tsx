/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactChild, useContext, useCallback, useState } from 'react';
import { cloneDeep, get, set } from 'lodash';

import { SerializedPolicy, RollupAction } from '../../../../common/types';

import { FormHook } from '../../../shared_imports';

interface Field {
  enabled: boolean;
  action: RollupAction;
}

interface RollupFormConfig {
  hot: Field;
  cold: Field;
}

type RollupFormHook = FormHook<RollupFormConfig>;
export interface RollupFormContextValue {
  getCurrent: () => RollupFormConfig;
  setCurrent: (
    rollupConfig: RollupFormConfig | ((rollupConfig: RollupFormConfig) => RollupFormConfig)
  ) => void;
  form: {
    submit: RollupFormHook['submit'];
  };
  addRollupConfigToPolicy: (policy: SerializedPolicy) => SerializedPolicy;
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

  const submit: RollupFormHook['submit'] = useCallback(async () => {
    const isValid = Object.values(rollupForm).every((v) => Boolean(v.enabled && v.action));

    return {
      data: {
        ...rollupForm,
      },
      isValid,
    };
  }, [rollupForm]);

  return (
    <RollupFormContext.Provider
      value={{
        addRollupConfigToPolicy,
        getCurrent: getCurrentRollupAction,
        setCurrent: setRollupForm,
        form: {
          submit,
        },
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
