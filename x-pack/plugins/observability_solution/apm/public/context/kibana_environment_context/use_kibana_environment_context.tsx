/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, createElement } from 'react';
import { KibanaEnvironmentContext, type KibanaEnvContext } from './kibana_environment_context';

export const useKibanaEnvironmentContextProvider = ({
  kibanaVersion,
  isCloudEnv,
  isServerlessEnv,
}: KibanaEnvContext) => {
  const value = useMemo(
    () => ({
      kibanaVersion,
      isCloudEnv,
      isServerlessEnv,
    }),
    [kibanaVersion, isCloudEnv, isServerlessEnv]
  );

  const Provider = ({
    kibanaEnvironment = {},
    children,
  }: {
    kibanaEnvironment?: KibanaEnvContext;
    children: React.ReactNode;
  }) => {
    const newProvider = createElement(KibanaEnvironmentContext.Provider, {
      value: { ...kibanaEnvironment, ...value },
      children,
    });

    return newProvider;
  };

  return Provider;
};
