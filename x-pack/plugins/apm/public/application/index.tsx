/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApmRoute } from '@elastic/apm-rum-react';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import 'react-vis/dist/style.css';
import styled, { DefaultTheme, ThemeProvider } from 'styled-components';
import { ConfigSchema } from '../';
import { AppMountParameters, CoreStart } from '../../../../../src/core/public';
import {
  KibanaContextProvider,
  RedirectAppLinks,
  useUiSetting$,
} from '../../../../../src/plugins/kibana_react/public';
import { routes } from '../components/app/Main/route_config';
import { ScrollToTopOnPathChange } from '../components/app/Main/ScrollToTopOnPathChange';
import {
  ApmPluginContext,
  ApmPluginContextValue,
} from '../context/apm_plugin/apm_plugin_context';
import { LicenseProvider } from '../context/license/license_context';
import { UrlParamsProvider } from '../context/url_params_context/url_params_context';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { createCallApmApi } from '../services/rest/createCallApmApi';
import { createStaticIndexPattern } from '../services/rest/index_pattern';
import { setHelpExtension } from '../setHelpExtension';
import { setReadonlyBadge } from '../updateBadge';

const MainContainer = styled.div`
  height: 100%;
`;

function App() {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  useBreadcrumbs(routes);

  return (
    <ThemeProvider
      theme={(outerTheme?: DefaultTheme) => ({
        ...outerTheme,
        eui: darkMode ? euiDarkVars : euiLightVars,
        darkMode,
      })}
    >
      <MainContainer data-test-subj="apmMainContainer" role="main">
        <Route component={ScrollToTopOnPathChange} />
        <Switch>
          {routes.map((route, i) => (
            <ApmRoute key={i} {...route} />
          ))}
        </Switch>
      </MainContainer>
    </ThemeProvider>
  );
}

export function ApmAppRoot({
  apmPluginContextValue,
  startDeps,
}: {
  apmPluginContextValue: ApmPluginContextValue;
  startDeps: ApmPluginStartDeps;
}) {
  const { appMountParameters, core } = apmPluginContextValue;
  const { history } = appMountParameters;
  const i18nCore = core.i18n;

  return (
    <RedirectAppLinks application={core.application}>
      <ApmPluginContext.Provider value={apmPluginContextValue}>
        <KibanaContextProvider services={{ ...core, ...startDeps }}>
          <i18nCore.Context>
            <Router history={history}>
              <UrlParamsProvider>
                <LicenseProvider>
                  <App />
                </LicenseProvider>
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
  setupDeps: ApmPluginSetupDeps,
  appMountParameters: AppMountParameters,
  config: ConfigSchema,
  startDeps: ApmPluginStartDeps
) => {
  const { element } = appMountParameters;
  const apmPluginContextValue = {
    appMountParameters,
    config,
    core,
    plugins: setupDeps,
  };

  // render APM feedback link in global help menu
  setHelpExtension(core);
  setReadonlyBadge(core);
  createCallApmApi(core.http);

  // Automatically creates static index pattern and stores as saved object
  createStaticIndexPattern().catch((e) => {
    // eslint-disable-next-line no-console
    console.log('Error creating static index pattern', e);
  });

  ReactDOM.render(
    <ApmAppRoot
      apmPluginContextValue={apmPluginContextValue}
      startDeps={startDeps}
    />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
