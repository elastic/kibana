/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, FC, useContext, useMemo } from 'react';
import { usePermissionCheck } from '../../capabilities/check_capabilities';

export interface EnabledFeatures {
  showNodeInfo: boolean;
  showFrozenDataTierChoice: boolean;
  showMLNavMenu: boolean;
  showLicenseInfo: boolean;
  isADEnabled: boolean;
  isDFAEnabled: boolean;
  isNLPEnabled: boolean;
}
export const EnabledFeaturesContext = createContext({
  showNodeInfo: true,
  showFrozenDataTierChoice: true,
  showMLNavMenu: true,
  showLicenseInfo: true,
  isADEnabled: true,
  isDFAEnabled: true,
  isNLPEnabled: true,
});

export const EnabledFeaturesContextProvider: FC<{ isServerless: boolean }> = ({
  children,
  isServerless,
}) => {
  const [isADEnabled, isDFAEnabled, isNLPEnabled] = usePermissionCheck([
    'isADEnabled',
    'isDFAEnabled',
    'isNLPEnabled',
  ]);

  const features: EnabledFeatures = {
    showNodeInfo: !isServerless,
    showFrozenDataTierChoice: !isServerless,
    showMLNavMenu: !isServerless,
    showLicenseInfo: !isServerless,
    isADEnabled,
    isDFAEnabled,
    isNLPEnabled,
  };

  return (
    <EnabledFeaturesContext.Provider value={features}>{children}</EnabledFeaturesContext.Provider>
  );
};

export function useEnabledFeatures() {
  const context = useContext(EnabledFeaturesContext);
  return useMemo(() => {
    return context;
  }, [context]);
}
