/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router } from 'react-router-dom';
import styled, { ThemeProvider, DefaultTheme } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { CoreStart, AppMountParameters } from 'kibana/public';
import { ApmPluginSetupDeps } from '../plugin';

import {
  KibanaContextProvider,
  useUiSetting$,
  RedirectAppLinks,
} from '../../../../../src/plugins/kibana_react/public';
import { px, units } from '../style/variables';
import { UpdateBreadcrumbs } from '../components/app/Main/UpdateBreadcrumbs';
import { ScrollToTopOnPathChange } from '../components/app/Main/ScrollToTopOnPathChange';
import 'react-vis/dist/style.css';
import { RumHome } from '../components/app/RumDashboard/RumHome';
import { ConfigSchema } from '../index';
import { BreadcrumbRoute } from '../components/app/Main/ProvideBreadcrumbs';
import { RouteName } from '../components/app/Main/route_config/route_names';
import { renderAsRedirectTo } from '../components/app/Main/route_config';
import { ApmPluginContext } from '../context/ApmPluginContext';
import { UrlParamsProvider } from '../context/UrlParamsContext';
import { LoadingIndicatorProvider } from '../context/LoadingIndicatorContext';
import { createCallApmApi } from '../services/rest/createCallApmApi';

const CsmMainContainer = styled.div`
  padding: ${px(units.plus)};
  height: 100%;
`;

export const rumRoutes: BreadcrumbRoute[] = [
  {
    exact: true,
    path: '/',
    render: renderAsRedirectTo('/csm'),
    breadcrumb: 'Client Side Monitoring',
    name: RouteName.CSM,
  },
];

function CsmApp() {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <ThemeProvider
      theme={(outerTheme?: DefaultTheme) => ({
        ...outerTheme,
        eui: darkMode ? euiDarkVars : euiLightVars,
        darkMode,
      })}
    >
      <CsmMainContainer data-test-subj="csmMainContainer" role="main">
        <UpdateBreadcrumbs routes={rumRoutes} />
        <Route component={ScrollToTopOnPathChange} />
        <RumHome />
      </CsmMainContainer>
    </ThemeProvider>
  );
}

export function CsmAppRoot({
  core,
  deps,
  history,
  config,
}: {
  core: CoreStart;
  deps: ApmPluginSetupDeps;
  history: AppMountParameters['history'];
  config: ConfigSchema;
}) {
  const i18nCore = core.i18n;
  const plugins = deps;
  const apmPluginContextValue = {
    config,
    core,
    plugins,
  };
  return (
    <RedirectAppLinks application={core.application}>
      <ApmPluginContext.Provider value={apmPluginContextValue}>
        <KibanaContextProvider services={{ ...core, ...plugins }}>
          <i18nCore.Context>
            <Router history={history}>
              <UrlParamsProvider>
                <LoadingIndicatorProvider>
                  <CsmApp />
                </LoadingIndicatorProvider>
              </UrlParamsProvider>
            </Router>
          </i18nCore.Context>
        </KibanaContextProvider>
      </ApmPluginContext.Provider>
    </RedirectAppLinks>
  );
}

/**
 * This module is rendered asynchronously in the Kibana platform.
 */

export const renderApp = (
  core: CoreStart,
  deps: ApmPluginSetupDeps,
  { element, history }: AppMountParameters,
  config: ConfigSchema
) => {
  createCallApmApi(core.http);

  ReactDOM.render(
    <CsmAppRoot core={core} deps={deps} history={history} config={config} />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
