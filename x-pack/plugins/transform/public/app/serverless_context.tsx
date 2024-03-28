/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import type { ExperimentalFeatures } from '../../common/config';

export interface TransformEnabledFeatures {
  showNodeInfo: boolean;
}
export const EnabledFeaturesContext = createContext({
  showNodeInfo: true,
});

export const EnabledFeaturesContextProvider: FC<{
  enabledFeatures: TransformEnabledFeatures;
}> = (props) => {
  const { children, enabledFeatures } = props;
  return (
    <EnabledFeaturesContext.Provider value={enabledFeatures}>
      {children}
    </EnabledFeaturesContext.Provider>
  );
};

export const ExperimentalFeaturesContext = createContext<ExperimentalFeatures>({
  ruleFormV2Enabled: false,
});
export const ExperimentalFeaturesContextProvider: FC<{
  experimentalFeatures: ExperimentalFeatures;
}> = (props) => {
  const { children, experimentalFeatures } = props;
  return (
    <ExperimentalFeaturesContext.Provider value={experimentalFeatures}>
      {children}
    </ExperimentalFeaturesContext.Provider>
  );
};

export function useEnabledFeatures() {
  const context = useContext(EnabledFeaturesContext);
  return useMemo(() => {
    return context;
  }, [context]);
}

export function useExperimentalFeatures() {
  const context = useContext(ExperimentalFeaturesContext);
  return useMemo(() => {
    return context;
  }, [context]);
}
