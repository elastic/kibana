/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiErrorBoundary } from '@elastic/eui';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';

import { observabilityRouter } from './route_config';
import type {
  ConfigSchema,
  ObservabilityPluginSetupDependencies,
  ObservabilityPluginStartDependencies,
} from './types';
import { ObservabilityAIAssistantProvider } from './features/ai_assistant/context/observability_ai_assistant_provider';
import { ObservabilityAIAssistantService } from './features/ai_assistant/types';
import { PluginContext } from './features/alerts_and_slos/context/plugin_context/plugin_context';
import { createObservabilityRuleTypeRegistry } from './features/alerts_and_slos/rules/create_observability_rule_type_registry';

export function Application({
  appMountParameters,
  config,
  coreStart,
  observabilityRuleTypeRegistry,
  pluginsSetup,
  pluginsStart,
  service,
}: {
  appMountParameters: AppMountParameters<unknown>;
  config: ConfigSchema;
  coreStart: CoreStart;
  observabilityRuleTypeRegistry: ReturnType<typeof createObservabilityRuleTypeRegistry>;
  pluginsSetup: ObservabilityPluginSetupDependencies;
  pluginsStart: ObservabilityPluginStartDependencies;
  service: ObservabilityAIAssistantService;
}) {
  const isDarkMode = coreStart.theme.getTheme().darkMode;

  const ApplicationUsageTrackingProvider =
    pluginsSetup.usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
  const CloudProvider = pluginsStart.cloud?.CloudContextProvider ?? React.Fragment;
  const PresentationContextProvider =
    pluginsStart.presentationUtil?.ContextProvider ?? React.Fragment;

  return (
    <PresentationContextProvider>
      <EuiErrorBoundary>
        <ApplicationUsageTrackingProvider>
          <CloudProvider>
            <KibanaThemeProvider {...{ theme: { theme$: appMountParameters.theme$ }, isDarkMode }}>
              <KibanaContextProvider
                services={{
                  ...coreStart,
                  ...pluginsStart,
                  plugins: {
                    start: pluginsStart,
                  },
                }}
              >
                <PluginContext.Provider
                  value={{
                    appMountParameters,
                    config,
                    coreStart,
                    observabilityRuleTypeRegistry,
                  }}
                >
                  <ObservabilityAIAssistantProvider value={service}>
                    <RedirectAppLinks coreStart={coreStart}>
                      <coreStart.i18n.Context>
                        <RouterProvider
                          history={appMountParameters.history}
                          router={observabilityRouter as any}
                        >
                          <RouteRenderer />
                        </RouterProvider>
                      </coreStart.i18n.Context>
                    </RedirectAppLinks>
                  </ObservabilityAIAssistantProvider>
                </PluginContext.Provider>
              </KibanaContextProvider>
            </KibanaThemeProvider>
          </CloudProvider>
        </ApplicationUsageTrackingProvider>
      </EuiErrorBoundary>
    </PresentationContextProvider>
  );
}
