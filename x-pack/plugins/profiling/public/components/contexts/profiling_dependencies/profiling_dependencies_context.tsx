/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart, CoreSetup } from '@kbn/core/public';
import { createContext } from 'react';
import { Services } from '../../../services';
import { ProfilingPluginPublicSetupDeps, ProfilingPluginPublicStartDeps } from '../../../types';

export interface ProfilingDependencies {
  start: {
    core: CoreStart;
  } & ProfilingPluginPublicStartDeps;
  setup: {
    core: CoreSetup;
  } & ProfilingPluginPublicSetupDeps;
  services: Services;
}

export const ProfilingDependenciesContext = createContext<ProfilingDependencies | undefined>(
  undefined
);

export const ProfilingDependenciesContextProvider = ProfilingDependenciesContext.Provider;
