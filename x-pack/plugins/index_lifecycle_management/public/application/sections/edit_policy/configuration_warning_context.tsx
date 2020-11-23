/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, createContext, useMemo, useContext } from 'react';
import { get } from 'lodash';

import { useFormData } from '../../../shared_imports';

interface Value {
  multipleShrinkActions: boolean;
}

const ConfigurationWarningContext = createContext<Value>(null as any);

const hotShrinkPath = 'phases.hot.actions.shrink.number_of_shards';
const warmShrinkPath = 'phases.warm.actions.shrink.number_of_shards';

export const ConfigurationWarningProvider: FunctionComponent = ({ children }) => {
  const [formData] = useFormData({
    watch: [hotShrinkPath, warmShrinkPath],
  });

  const configurationWarnings: Value = useMemo(
    () => ({
      multipleShrinkActions: get(formData, hotShrinkPath) && get(formData, warmShrinkPath),
    }),
    [formData]
  );

  return (
    <ConfigurationWarningContext.Provider value={configurationWarnings}>
      {children}
    </ConfigurationWarningContext.Provider>
  );
};

export const useConfigWarningContext = () => {
  const ctx = useContext(ConfigurationWarningContext);
  if (!ctx) {
    throw new Error(
      `"useConfigWarningContext" must be used inside of ConfigurationWarningProvider.`
    );
  }
  return ctx;
};
