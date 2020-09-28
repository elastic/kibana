/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { AppMountParameters, CoreStart } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router } from 'react-router-dom';
import 'react-vis/dist/style.css';
import styled, { DefaultTheme, ThemeProvider } from 'styled-components';
import {
  KibanaContextProvider,
  RedirectAppLinks,
  useUiSetting$,
} from '../../../../../src/plugins/kibana_react/public';
import { APMRouteDefinition } from '../application/routes';
import { renderAsRedirectTo } from '../components/app/Main/route_config';
import { ScrollToTopOnPathChange } from '../components/app/Main/ScrollToTopOnPathChange';
import { RumHome, UX_LABEL } from '../components/app/RumDashboard/RumHome';
import { ApmPluginContext } from '../context/ApmPluginContext';
import { LoadingIndicatorProvider } from '../context/LoadingIndicatorContext';
import { UrlParamsProvider } from '../context/UrlParamsContext';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { ConfigSchema } from '../index';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { createCallApmApi } from '../services/rest/createCallApmApi';
import { px, units } from '../style/variables';

const CsmMainContainer = styled.div`
  padding: ${px(units.plus)};
  height: 100%;
`;

export const rumRoutes: APMRouteDefinition[] = [
  {
    exact: true,
    path: '/',
    render: renderAsRedirectTo('/ux'),
    breadcrumb: UX_LABEL,
  },
];

function CsmApp() {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  useBreadcrumbs(rumRoutes);

  return (
    <ThemeProvider
      theme={(outerTheme?: DefaultTheme) => ({
        ...outerTheme,
        eui: darkMode ? euiDarkVars : euiLightVars,
        darkMode,
      })}
    >
      <CsmMainContainer data-test-subj="csmMainContainer" role="main">
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
  corePlugins: { embeddable },
}: {
  core: CoreStart;
  deps: ApmPluginSetupDeps;
  history: AppMountParameters['history'];
  config: ConfigSchema;
  corePlugins: ApmPluginStartDeps;
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
        <KibanaContextProvider services={{ ...core, ...plugins, embeddable }}>
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
  config: ConfigSchema,
  corePlugins: ApmPluginStartDeps
) => {
  createCallApmApi(core.http);

  ReactDOM.render(
    <CsmAppRoot
      core={core}
      deps={deps}
      history={history}
      config={config}
      corePlugins={corePlugins}
    />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
