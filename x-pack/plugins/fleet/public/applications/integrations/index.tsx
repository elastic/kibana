/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Redirect, Route } from 'react-router-dom';
import type { RouteProps } from 'react-router-dom';

import type { CoreStart, AppMountParameters } from 'src/core/public';

import type { FleetConfigType, FleetStartServices } from '../../plugin';
import { licenseService } from '../../hooks';
import type { UIExtensionsStorage } from '../../types';

import { AppRoutes, IntegrationsAppContext } from './app';

export interface ProtectedRouteProps extends RouteProps {
  isAllowed?: boolean;
  restrictedPath?: string;
}

export const ProtectedRoute: React.FunctionComponent<ProtectedRouteProps> = ({
  isAllowed = false,
  restrictedPath = '/',
  ...routeProps
}: ProtectedRouteProps) => {
  return isAllowed ? <Route {...routeProps} /> : <Redirect to={{ pathname: restrictedPath }} />;
};

interface IntegrationsAppProps {
  basepath: string;
  startServices: FleetStartServices;
  config: FleetConfigType;
  history: AppMountParameters['history'];
  kibanaVersion: string;
  extensions: UIExtensionsStorage;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
}
const IntegrationsApp = ({
  basepath,
  startServices,
  config,
  history,
  kibanaVersion,
  extensions,
  setHeaderActionMenu,
  theme$,
}: IntegrationsAppProps) => {
  return (
    <IntegrationsAppContext
      basepath={basepath}
      startServices={startServices}
      config={config}
      history={history}
      kibanaVersion={kibanaVersion}
      extensions={extensions}
      setHeaderActionMenu={setHeaderActionMenu}
      theme$={theme$}
    >
      <AppRoutes />
    </IntegrationsAppContext>
  );
};

export function renderApp(
  startServices: FleetStartServices,
  { element, appBasePath, history, setHeaderActionMenu, theme$ }: AppMountParameters,
  config: FleetConfigType,
  kibanaVersion: string,
  extensions: UIExtensionsStorage,
  UsageTracker: React.FC
) {
  ReactDOM.render(
    <UsageTracker>
      <IntegrationsApp
        basepath={appBasePath}
        startServices={startServices}
        config={config}
        history={history}
        kibanaVersion={kibanaVersion}
        extensions={extensions}
        setHeaderActionMenu={setHeaderActionMenu}
        theme$={theme$}
      />
    </UsageTracker>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}

export const teardownIntegrations = (coreStart: CoreStart) => {
  coreStart.chrome.docTitle.reset();
  coreStart.chrome.setBreadcrumbs([]);
  licenseService.stop();
};
