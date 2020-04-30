/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApmRoute } from '@elastic/apm-rum-react';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import styled from 'styled-components';
import { CoreStart, AppMountParameters } from '../../../../../src/core/public';
import { ApmPluginSetupDeps } from '../plugin';
import { ApmPluginContext } from '../context/ApmPluginContext';
import { LicenseProvider } from '../context/LicenseContext';
import { LoadingIndicatorProvider } from '../context/LoadingIndicatorContext';
import { LocationProvider } from '../context/LocationContext';
import { MatchedRouteProvider } from '../context/MatchedRouteContext';
import { UrlParamsProvider } from '../context/UrlParamsContext';
import { AlertsContextProvider } from '../../../triggers_actions_ui/public';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { px, unit, units } from '../style/variables';
import { UpdateBreadcrumbs } from '../components/app/Main/UpdateBreadcrumbs';
import { APMIndicesPermission } from '../components/app/APMIndicesPermission';
import { ScrollToTopOnPathChange } from '../components/app/Main/ScrollToTopOnPathChange';
import { routes } from '../components/app/Main/route_config';
import { history } from '../utils/history';
import { ConfigSchema } from '..';
import 'react-vis/dist/style.css';

const MainContainer = styled.div`
  min-width: ${px(unit * 50)};
  padding: ${px(units.plus)};
  height: 100%;
`;

const App = () => {
  return (
    <MainContainer data-test-subj="apmMainContainer" role="main">
      <UpdateBreadcrumbs routes={routes} />
      <Route component={ScrollToTopOnPathChange} />
      <APMIndicesPermission>
        <Switch>
          {routes.map((route, i) => (
            <ApmRoute key={i} {...route} />
          ))}
        </Switch>
      </APMIndicesPermission>
    </MainContainer>
  );
};

const ApmAppRoot = ({
  core,
  deps,
  routerHistory,
  config
}: {
  core: CoreStart;
  deps: ApmPluginSetupDeps;
  routerHistory: typeof history;
  config: ConfigSchema;
}) => {
  const i18nCore = core.i18n;
  const plugins = deps;
  const apmPluginContextValue = {
    config,
    core,
    plugins
  };
  return (
    <ApmPluginContext.Provider value={apmPluginContextValue}>
      <AlertsContextProvider
        value={{
          http: core.http,
          docLinks: core.docLinks,
          toastNotifications: core.notifications.toasts,
          actionTypeRegistry: plugins.triggers_actions_ui.actionTypeRegistry,
          alertTypeRegistry: plugins.triggers_actions_ui.alertTypeRegistry
        }}
      >
        <KibanaContextProvider services={{ ...core, ...plugins }}>
          <i18nCore.Context>
            <Router history={routerHistory}>
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
  );
};

/**
 * This module is rendered asynchronously in the Kibana platform.
 */
export const renderApp = (
  core: CoreStart,
  deps: ApmPluginSetupDeps,
  { element }: AppMountParameters,
  config: ConfigSchema
) => {
  ReactDOM.render(
    <ApmAppRoot
      core={core}
      deps={deps}
      routerHistory={history}
      config={config}
    />,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
