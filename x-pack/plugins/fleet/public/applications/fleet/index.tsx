/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Redirect, Route, RouteProps } from 'react-router-dom';
import { CoreStart, AppMountParameters } from 'src/core/public';
import { FleetConfigType, FleetStartServices } from '../../plugin';
import { licenseService } from './hooks';
import { UIExtensionsStorage } from './types';
import { AppRoutes, FleetAppContext, WithPermissionsAndSetup } from './app';

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

interface FleetAppProps {
  basepath: string;
  startServices: FleetStartServices;
  config: FleetConfigType;
  history: AppMountParameters['history'];
  kibanaVersion: string;
  extensions: UIExtensionsStorage;
}
const FleetApp = ({
  basepath,
  startServices,
  config,
  history,
  kibanaVersion,
  extensions,
}: FleetAppProps) => {
  return (
    <FleetAppContext
      basepath={basepath}
      startServices={startServices}
      config={config}
      history={history}
      kibanaVersion={kibanaVersion}
      extensions={extensions}
    >
      <WithPermissionsAndSetup>
        <AppRoutes />
      </WithPermissionsAndSetup>
    </FleetAppContext>
  );
};

export function renderApp(
  startServices: FleetStartServices,
  { element, appBasePath, history }: AppMountParameters,
  config: FleetConfigType,
  kibanaVersion: string,
  extensions: UIExtensionsStorage
) {
  ReactDOM.render(
    <FleetApp
      basepath={appBasePath}
      startServices={startServices}
      config={config}
      history={history}
      kibanaVersion={kibanaVersion}
      extensions={extensions}
    />,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}

export const teardownFleet = (coreStart: CoreStart) => {
  coreStart.chrome.docTitle.reset();
  coreStart.chrome.setBreadcrumbs([]);
  licenseService.stop();
};
