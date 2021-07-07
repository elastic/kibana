/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmRoute } from '@elastic/apm-rum-react';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import { DefaultTheme, ThemeProvider } from 'styled-components';
import { APP_WRAPPER_CLASS } from '../../../../../../src/core/public';
import {
  KibanaContextProvider,
  RedirectAppLinks,
  useUiSetting$,
} from '../../../../../../src/plugins/kibana_react/public';
import { ScrollToTopOnPathChange } from '../../components/app/Main/ScrollToTopOnPathChange';
import {
  ApmPluginContext,
  ApmPluginContextValue,
} from '../../context/apm_plugin/apm_plugin_context';
import { LicenseProvider } from '../../context/license/license_context';
import { UrlParamsProvider } from '../../context/url_params_context/url_params_context';
import { useApmBreadcrumbs } from '../../hooks/use_apm_breadcrumbs';
import { ApmPluginStartDeps } from '../../plugin';
import { HeaderMenuPortal } from '../../../../observability/public';
import { ApmHeaderActionMenu } from '../shared/apm_header_action_menu';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';
import { AnomalyDetectionJobsContextProvider } from '../../context/anomaly_detection_jobs/anomaly_detection_jobs_context';
import { apmRouteConfig } from './apm_route_config';

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
            <Router history={history}>
              <UrlParamsProvider>
                <LicenseProvider>
                  <AnomalyDetectionJobsContextProvider>
                    <ApmThemeProvider>
                      <MountApmHeaderActionMenu />

                      <Route component={ScrollToTopOnPathChange} />
                      <Switch>
                        {apmRouteConfig.map((route, i) => (
                          <ApmRoute key={i} {...route} />
                        ))}
                      </Switch>
                    </ApmThemeProvider>
                  </AnomalyDetectionJobsContextProvider>
                </LicenseProvider>
              </UrlParamsProvider>
            </Router>
          </i18nCore.Context>
        </KibanaContextProvider>
      </ApmPluginContext.Provider>
    </RedirectAppLinks>
  );
}

function MountApmHeaderActionMenu() {
  useApmBreadcrumbs(apmRouteConfig);
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
