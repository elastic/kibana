/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { createBrowserHistory } from 'history';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PluginContext } from '../../../context/plugin_context';
import { SloEmbeddableDeps } from '../overview/types';

const queryClient = new QueryClient();

export interface SloEmbeddableContextProps {
  deps: SloEmbeddableDeps;
  children: React.ReactNode;
}

export function SloEmbeddableContext({ deps, children }: SloEmbeddableContextProps) {
  const { observabilityRuleTypeRegistry } = deps.observability;
  const { navigation } = deps.observabilityShared;

  return (
    <Router history={createBrowserHistory()}>
      <EuiThemeProvider darkMode={true}>
        <KibanaContextProvider services={deps}>
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
    </Router>
  );
}
