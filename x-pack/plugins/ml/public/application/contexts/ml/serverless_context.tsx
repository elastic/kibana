/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import type { ExperimentalFeatures, MlFeatures } from '../../../../common/constants/app';

export interface EnabledFeatures {
  showNodeInfo: boolean;
  showMLNavMenu: boolean;
  showLicenseInfo: boolean;
  isADEnabled: boolean;
  isDFAEnabled: boolean;
  isNLPEnabled: boolean;
  showRuleFormV2: boolean;
}
export const EnabledFeaturesContext = createContext({
  showNodeInfo: true,
  showMLNavMenu: true,
  showLicenseInfo: true,
  isADEnabled: true,
  isDFAEnabled: true,
  isNLPEnabled: true,
});

interface Props {
  isServerless: boolean;
  mlFeatures: MlFeatures;
  showMLNavMenu?: boolean;
  experimentalFeatures?: ExperimentalFeatures;
}

export const EnabledFeaturesContextProvider: FC<Props> = ({
  children,
  isServerless,
  showMLNavMenu = true,
  mlFeatures,
  experimentalFeatures,
}) => {
  const features: EnabledFeatures = {
    showNodeInfo: !isServerless,
    showMLNavMenu,
    showLicenseInfo: !isServerless,
    isADEnabled: mlFeatures.ad,
    isDFAEnabled: mlFeatures.dfa,
    isNLPEnabled: mlFeatures.nlp,
    showRuleFormV2: experimentalFeatures?.ruleFormV2 ?? false,
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
