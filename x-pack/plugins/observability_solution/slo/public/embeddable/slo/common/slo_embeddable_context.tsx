/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Router } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserHistory } from 'history';
import React from 'react';
import { PluginContext } from '../../../context/plugin_context';
import { SLOEmbeddableDeps } from '../types';

const queryClient = new QueryClient();

interface SLOEmbeddableContextProps {
  deps: SLOEmbeddableDeps;
  children: React.ReactNode;
}

export function SLOEmbeddableContext({ deps, children }: SLOEmbeddableContextProps) {
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
              sloClient: deps.sloClient,
            }}
          >
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          </PluginContext.Provider>
        </KibanaContextProvider>
      </EuiThemeProvider>
    </Router>
  );
}
