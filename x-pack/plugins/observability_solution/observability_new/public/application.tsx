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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { useKibanaEnvironmentContextProvider } from './features/apm/context/kibana_environment_context/use_kibana_environment_context';

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
  const KibanaEnvironmentContextProvider = useKibanaEnvironmentContextProvider(kibanaEnvironment);
  const queryClient = new QueryClient();

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
              <KibanaEnvironmentContextProvider
                kibanaEnvironment={{
                  isCloudEnv,
                  isServerlessEnv,
                  kibanaVersion: this.kibanaVersion,
                }}
              >
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
                        <QueryClientProvider client={queryClient}>
                          <coreStart.i18n.Context>
                            <RouterProvider
                              history={appMountParameters.history}
                              router={observabilityRouter as any}
                            >
                              <RouteRenderer />
                            </RouterProvider>
                          </coreStart.i18n.Context>
                        </QueryClientProvider>
                      </RedirectAppLinks>
                    </ObservabilityAIAssistantProvider>
                  </PluginContext.Provider>
                </KibanaContextProvider>
              </KibanaEnvironmentContextProvider>
            </KibanaThemeProvider>
          </CloudProvider>
        </ApplicationUsageTrackingProvider>
      </EuiErrorBoundary>
    </PresentationContextProvider>
  );
}

/*

    <div className={APP_WRAPPER_CLASS} data-test-subj="apmMainContainer" role="main">
      <RedirectAppLinks
        coreStart={{
          application: core.application,
        }}
      >
        <ApmPluginContext.Provider value={apmPluginContextValue}>
          <KibanaContextProvider services={{ ...core, ...pluginsStart, storage, ...apmServices }}>
            <KibanaEnvironmentContextProvider kibanaEnvironment={kibanaEnvironment}>
              <i18nCore.Context>
                <TimeRangeIdContextProvider>
                  <RouterProvider history={history} router={apmRouter as any}>
                    <ApmErrorBoundary>
                      <RedirectDependenciesToDependenciesInventory>
                        <RedirectWithDefaultEnvironment>
                          <RedirectWithDefaultDateRange>
                            <RedirectWithOffset>
                              <TrackPageview>
                                <UpdateExecutionContextOnRouteChange>
                                  <BreadcrumbsContextProvider>
                                    <UrlParamsProvider>
                                      <LicenseProvider>
                                        <AnomalyDetectionJobsContextProvider>
                                          <InspectorContextProvider>
                                            <ApmThemeProvider>
                                              <MountApmHeaderActionMenu />

                                              <Route component={ScrollToTopOnPathChange} />
                                              <RouteRenderer />
                                            </ApmThemeProvider>
                                          </InspectorContextProvider>
                                        </AnomalyDetectionJobsContextProvider>
                                      </LicenseProvider>
                                    </UrlParamsProvider>
                                  </BreadcrumbsContextProvider>
                                </UpdateExecutionContextOnRouteChange>
                              </TrackPageview>
                            </RedirectWithOffset>
                          </RedirectWithDefaultDateRange>
                        </RedirectWithDefaultEnvironment>
                      </RedirectDependenciesToDependenciesInventory>
                    </ApmErrorBoundary>
                  </RouterProvider>
                </TimeRangeIdContextProvider>
              </i18nCore.Context>
            </KibanaEnvironmentContextProvider>
          </KibanaContextProvider>
        </ApmPluginContext.Provider>
      </RedirectAppLinks>
    </div>

*/
