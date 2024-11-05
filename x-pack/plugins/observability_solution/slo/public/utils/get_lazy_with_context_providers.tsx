/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { Suspense } from 'react';
import { ExperimentalFeatures } from '../../common/config';
import { PluginContext } from '../context/plugin_context';
import { SLOPublicPluginsStart, SLORepositoryClient } from '../types';

interface Props {
  core: CoreStart;
  plugins: SLOPublicPluginsStart;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  isDev?: boolean;
  kibanaVersion: string;
  isServerless?: boolean;
  experimentalFeatures: ExperimentalFeatures;
  sloClient: SLORepositoryClient;
}

export type LazyWithContextProviders = ReturnType<typeof getLazyWithContextProviders>;

export const getLazyWithContextProviders =
  ({
    core,
    plugins,
    observabilityRuleTypeRegistry,
    ObservabilityPageTemplate,
    isDev,
    kibanaVersion,
    isServerless,
    experimentalFeatures,
    sloClient,
  }: Props) =>
  (LazyComponent: React.LazyExoticComponent<any>): React.FunctionComponent => {
    const queryClient = new QueryClient();
    return (props) => (
      <KibanaContextProvider
        services={{
          ...core,
          ...plugins,
          storage: new Storage(localStorage),
          isDev,
          kibanaVersion,
          isServerless,
        }}
      >
        <PluginContext.Provider
          value={{
            isDev,
            observabilityRuleTypeRegistry,
            ObservabilityPageTemplate,
            experimentalFeatures,
            sloClient,
          }}
        >
          <QueryClientProvider client={queryClient}>
            <Suspense>
              <LazyComponent {...props} />
            </Suspense>
          </QueryClientProvider>
        </PluginContext.Provider>
      </KibanaContextProvider>
    );
  };
