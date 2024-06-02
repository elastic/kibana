/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import type { ConfigSchema, ObservabilityPublicPluginsStart } from '../plugin';
import type { ObservabilityKibanaContext } from '../hooks/use_kibana';
import type { ObservabilityRuleTypeRegistry } from '../rules/create_observability_rule_type_registry';
import { PluginContext } from '../context/plugin_context/plugin_context';

export function SharedProviders({
  coreStart,
  pluginsStart,
  isDev,
  kibanaVersion,
  children,
  config,
  observabilityRuleTypeRegistry,
  appMountParameters,
  ObservabilityPageTemplate,
}: {
  coreStart: CoreStart;
  pluginsStart: ObservabilityPublicPluginsStart;
  isDev: boolean;
  kibanaVersion: string;
  children: React.ReactNode;
  config: ConfigSchema;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  appMountParameters?: AppMountParameters;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
}) {
  const PresentationContextProvider = useMemo(() => {
    return pluginsStart.presentationUtil?.ContextProvider ?? React.Fragment;
  }, [pluginsStart.presentationUtil]);

  const CloudProvider = useMemo(() => {
    return pluginsStart.cloud?.CloudContextProvider ?? React.Fragment;
  }, [pluginsStart.cloud]);

  const theme = useMemo(
    () => ({ theme: { theme$: coreStart.theme.theme$ } }),
    [coreStart.theme.theme$]
  );

  const services: ObservabilityKibanaContext = useMemo(
    () => ({
      ...coreStart,
      ...pluginsStart,
      storage: new Storage(window.localStorage),
      isDev,
      kibanaVersion,
      isServerless: Boolean(pluginsStart.serverless),
    }),
    [coreStart, pluginsStart, isDev, kibanaVersion]
  );

  const queryClient = useMemo(() => {
    return new QueryClient();
  }, []);

  const pluginContextValue = useMemo(() => {
    return {
      isDev,
      config,
      appMountParameters,
      observabilityRuleTypeRegistry,
      ObservabilityPageTemplate,
    };
  }, [isDev, config, appMountParameters, observabilityRuleTypeRegistry, ObservabilityPageTemplate]);

  return (
    <PresentationContextProvider>
      <CloudProvider>
        <KibanaThemeProvider {...theme}>
          <KibanaContextProvider services={services}>
            <EuiThemeProvider darkMode={coreStart.theme.getTheme().darkMode}>
              <PluginContext.Provider value={pluginContextValue}>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
              </PluginContext.Provider>
            </EuiThemeProvider>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </CloudProvider>
    </PresentationContextProvider>
  );
}
