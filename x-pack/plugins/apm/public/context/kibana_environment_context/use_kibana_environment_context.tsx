/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, createElement } from 'react';
import { ApmPluginStartDeps } from '../../plugin';
import {
  KibanaEnvironmentContext,
  type KibanaEnvContext,
} from './kibana_environment_context';

export const useKibanaEnvironmentContextProvider = (
  plugins: ApmPluginStartDeps
) => {
  const value = useMemo(
    () => ({
      kibanaVersion: plugins.kibanaVersion,
      isCloudEnv: plugins.isCloudEnv,
      isServerlessEnv: plugins.isServerlessEnv,
    }),
    [plugins]
  );

  const Provider: React.FC<{ kibanaEnvironment?: KibanaEnvContext }> = ({
    kibanaEnvironment = {},
    children,
  }) => {
    const newProvider = createElement(KibanaEnvironmentContext.Provider, {
      value: { ...kibanaEnvironment, ...value },
      children,
    });

    return newProvider;
  };

  return Provider;
};
