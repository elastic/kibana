/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ObservabilityAIAssistantProvider } from '@kbn/observability-ai-assistant-plugin/public';
import React, { ReactChild, useMemo } from 'react';
import { CoreSetup, CoreStart } from '@kbn/core/public';
import { ProfilingDependenciesContextProvider } from '../components/contexts/profiling_dependencies/profiling_dependencies_context';
import { ProfilingPluginPublicSetupDeps, ProfilingPluginPublicStartDeps } from '../types';
import { Services } from '../services';

export interface ProfilingEmbeddablesDependencies {
  coreStart: CoreStart;
  coreSetup: CoreSetup;
  pluginsStart: ProfilingPluginPublicStartDeps;
  pluginsSetup: ProfilingPluginPublicSetupDeps;
  profilingFetchServices: Services;
}

export type GetProfilingEmbeddableDependencies = () => Promise<ProfilingEmbeddablesDependencies>;

interface Props {
  deps: ProfilingEmbeddablesDependencies;
  children: ReactChild;
}

export function ProfilingEmbeddableProvider({ deps, children }: Props) {
  const profilingDependencies = useMemo(
    () => ({
      start: {
        core: deps.coreStart,
        ...deps.pluginsStart,
      },
      setup: {
        core: deps.coreSetup,
        ...deps.pluginsSetup,
      },
      services: deps.profilingFetchServices,
    }),
    [deps]
  );

  return (
    <KibanaContextProvider services={{ ...deps.coreStart, ...deps.pluginsStart }}>
      <ProfilingDependenciesContextProvider value={profilingDependencies}>
        <ObservabilityAIAssistantProvider value={deps.pluginsStart.observabilityAIAssistant}>
          {children}
        </ObservabilityAIAssistantProvider>
      </ProfilingDependenciesContextProvider>
    </KibanaContextProvider>
  );
}
