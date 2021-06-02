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
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';
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
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { ApmPluginStartDeps } from '../../plugin';
import { HeaderMenuPortal } from '../../../../observability/public';
import { ApmHeaderActionMenu } from '../shared/apm_header_action_menu';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';
import { AnomalyDetectionJobsContextProvider } from '../../context/anomaly_detection_jobs/anomaly_detection_jobs_context';
import { apmRouteConfig } from './apm_route_config';

const MainContainer = euiStyled.div`
  height: 100%;
`;

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
    <RedirectAppLinks application={core.application}>
      <ApmPluginContext.Provider value={apmPluginContextValue}>
        <KibanaContextProvider services={{ ...core, ...pluginsStart }}>
          <i18nCore.Context>
            <Router history={history}>
              <UrlParamsProvider>
                <LicenseProvider>
                  <AnomalyDetectionJobsContextProvider>
                    <ApmThemeProvider>
                      <MainContainer
                        data-test-subj="apmMainContainer"
                        role="main"
                      >
                        <MountApmHeaderActionMenu />

                        <Route component={ScrollToTopOnPathChange} />
                        <Switch>
                          {apmRouteConfig.map((route, i) => (
                            <ApmRoute key={i} {...route} />
                          ))}
                        </Switch>
                      </MainContainer>
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
  useBreadcrumbs(apmRouteConfig);
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
