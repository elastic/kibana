/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, FC, useContext, useMemo } from 'react';

export interface TransformEnabledFeatures {
  showNodeInfo: boolean;
}
export const EnabledFeaturesContext = createContext({
  showNodeInfo: true,
});

export const EnabledFeaturesContextProvider: FC<{ enabledFeatures: TransformEnabledFeatures }> = (
  props
) => {
  const { children, enabledFeatures } = props;
  return (
    <EnabledFeaturesContext.Provider value={enabledFeatures}>
      {children}
    </EnabledFeaturesContext.Provider>
  );
};

export function useEnabledFeatures() {
  const context = useContext(EnabledFeaturesContext);
  return useMemo(() => {
    return context;
  }, [context]);
}
