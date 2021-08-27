/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import React from 'react';
import { Route } from 'react-router-dom';
import type { DefaultTheme } from 'styled-components';
import { ThemeProvider } from 'styled-components';
import { APP_WRAPPER_CLASS } from '../../../../../../src/core/utils/app_wrapper_class';
import { RedirectAppLinks } from '../../../../../../src/plugins/kibana_react/public/app_links/redirect_app_link';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public/context/context';
import { useUiSetting$ } from '../../../../../../src/plugins/kibana_react/public/ui_settings/use_ui_setting';
import { HeaderMenuPortal } from '../../../../observability/public/components/shared';
import { AnomalyDetectionJobsContextProvider } from '../../context/anomaly_detection_jobs/anomaly_detection_jobs_context';
import type { ApmPluginContextValue } from '../../context/apm_plugin/apm_plugin_context';
import { ApmPluginContext } from '../../context/apm_plugin/apm_plugin_context';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';
import { BreadcrumbsContextProvider } from '../../context/breadcrumbs/context';
import { LicenseProvider } from '../../context/license/license_context';
import { UrlParamsProvider } from '../../context/url_params_context/url_params_context';
import type { ApmPluginStartDeps } from '../../plugin';
import { ScrollToTopOnPathChange } from '../app/Main/ScrollToTopOnPathChange';
import { ApmHeaderActionMenu } from '../shared/apm_header_action_menu';
import { apmRouter } from './apm_route_config';
import { TrackPageview } from './track_pageview';

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
        <KibanaContextProvider services={{ ...core, ...pluginsStart }}>
          <i18nCore.Context>
            <RouterProvider history={history} router={apmRouter as any}>
              <TrackPageview>
                <BreadcrumbsContextProvider>
                  <UrlParamsProvider>
                    <LicenseProvider>
                      <AnomalyDetectionJobsContextProvider>
                        <ApmThemeProvider>
                          <MountApmHeaderActionMenu />

                          <Route component={ScrollToTopOnPathChange} />
                          <RouteRenderer />
                        </ApmThemeProvider>
                      </AnomalyDetectionJobsContextProvider>
                    </LicenseProvider>
                  </UrlParamsProvider>
                </BreadcrumbsContextProvider>
              </TrackPageview>
            </RouterProvider>
          </i18nCore.Context>
        </KibanaContextProvider>
      </ApmPluginContext.Provider>
    </RedirectAppLinks>
  );
}

function MountApmHeaderActionMenu() {
  const { setHeaderActionMenu } = useApmPluginContext().appMountParameters;

  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu}>
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
