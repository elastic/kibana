/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import {
  KibanaContextProvider,
  RedirectAppLinks,
  useUiSetting$,
} from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  HeaderMenuPortal,
  InspectorContextProvider,
} from '@kbn/observability-plugin/public';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { euiDarkVars, euiLightVars } from '@kbn/ui-theme';
import React from 'react';
import { Route } from 'react-router-dom';
import { DefaultTheme, ThemeProvider } from 'styled-components';
import { AnomalyDetectionJobsContextProvider } from '../../context/anomaly_detection_jobs/anomaly_detection_jobs_context';
import {
  ApmPluginContext,
  ApmPluginContextValue,
} from '../../context/apm_plugin/apm_plugin_context';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';
import { BreadcrumbsContextProvider } from '../../context/breadcrumbs/context';
import { LicenseProvider } from '../../context/license/license_context';
import { TimeRangeIdContextProvider } from '../../context/time_range_id/time_range_id_context';
import { UrlParamsProvider } from '../../context/url_params_context/url_params_context';
import { ApmPluginStartDeps } from '../../plugin';
import { ScrollToTopOnPathChange } from '../app/main/scroll_to_top_on_path_change';
import { ApmHeaderActionMenu } from '../shared/apm_header_action_menu';
import { RedirectWithDefaultDateRange } from '../shared/redirect_with_default_date_range';
import { RedirectWithDefaultEnvironment } from '../shared/redirect_with_default_environment';
import { RedirectWithOffset } from '../shared/redirect_with_offset';
import { ApmErrorBoundary } from './apm_error_boundary';
import { apmRouter } from './apm_route_config';
import { RedirectDependenciesToDependenciesInventory } from './home/redirect_dependencies_to_dependencies_inventory';
import { TrackPageview } from './track_pageview';

const storage = new Storage(localStorage);

export function ApmAppRoot({
  apmPluginContextValue,
  pluginsStart,
}: {
  apmPluginContextValue: ApmPluginContextValue;
  pluginsStart: ApmPluginStartDeps;
}) {
  const { appMountParameters, core } = apmPluginContextValue;
  const { history } = appMountParameters;
  const i18nCore = core.i18n;

  return (
    <RedirectAppLinks
      application={core.application}
      className={APP_WRAPPER_CLASS}
      data-test-subj="apmMainContainer"
      role="main"
    >
      <ApmPluginContext.Provider value={apmPluginContextValue}>
        <KibanaContextProvider services={{ ...core, ...pluginsStart, storage }}>
          <i18nCore.Context>
            <TimeRangeIdContextProvider>
              <RouterProvider history={history} router={apmRouter as any}>
                <ApmErrorBoundary>
                  <RedirectDependenciesToDependenciesInventory>
                    <RedirectWithDefaultEnvironment>
                      <RedirectWithDefaultDateRange>
                        <RedirectWithOffset>
                          <TrackPageview>
                            <BreadcrumbsContextProvider>
                              <UrlParamsProvider>
                                <LicenseProvider>
                                  <AnomalyDetectionJobsContextProvider>
                                    <InspectorContextProvider>
                                      <ApmThemeProvider>
                                        <MountApmHeaderActionMenu />

                                        <Route
                                          component={ScrollToTopOnPathChange}
                                        />
                                        <RouteRenderer />
                                      </ApmThemeProvider>
                                    </InspectorContextProvider>
                                  </AnomalyDetectionJobsContextProvider>
                                </LicenseProvider>
                              </UrlParamsProvider>
                            </BreadcrumbsContextProvider>
                          </TrackPageview>
                        </RedirectWithOffset>
                      </RedirectWithDefaultDateRange>
                    </RedirectWithDefaultEnvironment>
                  </RedirectDependenciesToDependenciesInventory>
                </ApmErrorBoundary>
              </RouterProvider>
            </TimeRangeIdContextProvider>
          </i18nCore.Context>
        </KibanaContextProvider>
      </ApmPluginContext.Provider>
    </RedirectAppLinks>
  );
}

function MountApmHeaderActionMenu() {
  const { setHeaderActionMenu, theme$ } =
    useApmPluginContext().appMountParameters;

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
      <ApmHeaderActionMenu />
    </HeaderMenuPortal>
  );
}

function ApmThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <ThemeProvider
      theme={(outerTheme?: DefaultTheme) => ({
        ...outerTheme,
        eui: darkMode ? euiDarkVars : euiLightVars,
        darkMode,
      })}
    >
      {children}
    </ThemeProvider>
  );
}
