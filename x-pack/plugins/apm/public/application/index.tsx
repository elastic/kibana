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
import { AlertsContextProvider } from '../../../triggers_actions_ui/public';
import { routes } from '../components/app/Main/route_config';
import { ScrollToTopOnPathChange } from '../components/app/Main/ScrollToTopOnPathChange';
import { UpdateBreadcrumbs } from '../components/app/Main/UpdateBreadcrumbs';
import { ApmPluginContext } from '../context/ApmPluginContext';
import { LicenseProvider } from '../context/LicenseContext';
import { LoadingIndicatorProvider } from '../context/LoadingIndicatorContext';
import { LocationProvider } from '../context/LocationContext';
import { MatchedRouteProvider } from '../context/MatchedRouteContext';
import { UrlParamsProvider } from '../context/UrlParamsContext';
import { ApmPluginSetupDeps } from '../plugin';
import { createCallApmApi } from '../services/rest/createCallApmApi';
import { createStaticIndexPattern } from '../services/rest/index_pattern';
import { setHelpExtension } from '../setHelpExtension';
import { px, units } from '../style/variables';
import { setReadonlyBadge } from '../updateBadge';

const MainContainer = styled.div`
  padding: ${px(units.plus)};
  height: 100%;
`;

function App() {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <ThemeProvider
      theme={(outerTheme?: DefaultTheme) => ({
        ...outerTheme,
        eui: darkMode ? euiDarkVars : euiLightVars,
        darkMode,
      })}
    >
      <MainContainer data-test-subj="apmMainContainer" role="main">
        <UpdateBreadcrumbs routes={routes} />
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
        <AlertsContextProvider
          value={{
            http: core.http,
            docLinks: core.docLinks,
            capabilities: core.application.capabilities,
            toastNotifications: core.notifications.toasts,
            actionTypeRegistry: plugins.triggers_actions_ui.actionTypeRegistry,
            alertTypeRegistry: plugins.triggers_actions_ui.alertTypeRegistry,
          }}
        >
          <KibanaContextProvider services={{ ...core, ...plugins }}>
            <i18nCore.Context>
              <Router history={history}>
                <LocationProvider>
                  <MatchedRouteProvider routes={routes}>
                    <UrlParamsProvider>
                      <LoadingIndicatorProvider>
                        <LicenseProvider>
                          <App />
                        </LicenseProvider>
                      </LoadingIndicatorProvider>
                    </UrlParamsProvider>
                  </MatchedRouteProvider>
                </LocationProvider>
              </Router>
            </i18nCore.Context>
          </KibanaContextProvider>
        </AlertsContextProvider>
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
    <ApmAppRoot core={core} deps={deps} history={history} config={config} />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
