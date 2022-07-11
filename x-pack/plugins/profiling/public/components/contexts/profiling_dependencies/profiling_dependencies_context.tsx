/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreSetup, CoreStart } from '@kbn/core/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import { createContext } from 'react';
import { Services } from '../../../services';

export interface ProfilingDependencies {
  start: {
    core: CoreStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    observability: ObservabilityPublicStart;
  };
  setup: {
    core: CoreSetup;
    data: DataPublicPluginSetup;
    dataViews: DataViewsPublicPluginSetup;
    observability: ObservabilityPublicSetup;
  };
  services: Services;
}

export const ProfilingDependenciesContext = createContext<ProfilingDependencies | undefined>(
  undefined
);

export const ProfilingDependenciesContextProvider = ProfilingDependenciesContext.Provider;
