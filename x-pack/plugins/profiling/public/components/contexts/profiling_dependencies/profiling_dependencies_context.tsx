/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createContext } from 'react';
import { CoreSetup, CoreStart } from '@kbn/core/public';
import {
  ObservabilityPublicStart,
  ObservabilityPublicSetup,
} from '@kbn/observability-plugin/public';
import { DataPublicPluginStart, DataPublicPluginSetup } from '@kbn/data-plugin/public';
import { Services } from '../../../services';

export interface ProfilingDependencies {
  start: {
    core: CoreStart;
    data: DataPublicPluginStart;
    observability: ObservabilityPublicStart;
  };
  setup: {
    core: CoreSetup;
    data: DataPublicPluginSetup;
    observability: ObservabilityPublicSetup;
  };
  services: Services;
}

export const ProfilingDependenciesContext = createContext<ProfilingDependencies | undefined>(
  undefined
);

export const ProfilingDependenciesContextProvider = ProfilingDependenciesContext.Provider;
