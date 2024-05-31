/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import { CoreStart } from '@kbn/core/public';
import { SloPublicPluginsStart } from '../../..';
import { PluginContext } from '../../../context/plugin_context';
import { StartServices } from '../../../utils/kibana_react';

const queryClient = new QueryClient();

export interface SloEmbeddableContextProps {
  coreStart: CoreStart;
  pluginsStart: SloPublicPluginsStart;
  kibanaVersion: string;
}

export function SloEmbeddableContext({
  coreStart,
  pluginsStart,
  children,
  kibanaVersion,
}: SloEmbeddableContextProps & { children: React.ReactNode }) {
  const { observabilityRuleTypeRegistry } = pluginsStart.observability;
  const { navigation } = pluginsStart.observabilityShared;

  const services = useMemo<StartServices>(() => {
    return {
      ...coreStart,
      ...pluginsStart,
      storage: new Storage(window.localStorage),
      isServerless: !!pluginsStart.serverless,
      kibanaVersion,
    };
  }, [coreStart, pluginsStart, kibanaVersion]);

  return (
    <EuiThemeProvider darkMode={true}>
      <KibanaContextProvider services={services}>
        <PluginContext.Provider
          value={{
            observabilityRuleTypeRegistry,
            ObservabilityPageTemplate: navigation.PageTemplate,
          }}
        >
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </PluginContext.Provider>
      </KibanaContextProvider>
    </EuiThemeProvider>
  );
}
