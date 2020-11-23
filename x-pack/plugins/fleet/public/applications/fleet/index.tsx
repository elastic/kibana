/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Redirect, Route, RouteProps } from 'react-router-dom';
import { CoreStart, AppMountParameters } from 'src/core/public';
import { FleetSetupDeps, FleetConfigType, FleetStartDeps } from '../../plugin';
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

const FleetApp = ({
  basepath,
  coreStart,
  setupDeps,
  startDeps,
  config,
  history,
  kibanaVersion,
  extensions,
}: {
  basepath: string;
  coreStart: CoreStart;
  setupDeps: FleetSetupDeps;
  startDeps: FleetStartDeps;
  config: FleetConfigType;
  history: AppMountParameters['history'];
  kibanaVersion: string;
  extensions: UIExtensionsStorage;
}) => {
  return (
    <FleetAppContext
      basepath={basepath}
      coreStart={coreStart}
      setupDeps={setupDeps}
      startDeps={startDeps}
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
  coreStart: CoreStart,
  { element, appBasePath, history }: AppMountParameters,
  setupDeps: FleetSetupDeps,
  startDeps: FleetStartDeps,
  config: FleetConfigType,
  kibanaVersion: string,
  extensions: UIExtensionsStorage
) {
  ReactDOM.render(
    <FleetApp
      basepath={appBasePath}
      coreStart={coreStart}
      setupDeps={setupDeps}
      startDeps={startDeps}
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
