/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import type { RouteProps } from 'react-router-dom';
import { Redirect, Route } from 'react-router-dom';

import type { CoreStart } from '../../../../../../src/core/public/types';
import type { AppMountParameters } from '../../../../../../src/core/public/application/types';
import type { FleetConfigType } from '../../../common/types';
import { licenseService } from '../../hooks/use_license';
import type { FleetStartServices } from '../../plugin';
import type { UIExtensionsStorage } from '../../types/ui_extensions';

import { AppRoutes, IntegrationsAppContext, WithPermissionsAndSetup } from './app';

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
}
const IntegrationsApp = ({
  basepath,
  startServices,
  config,
  history,
  kibanaVersion,
  extensions,
}: IntegrationsAppProps) => {
  return (
    <IntegrationsAppContext
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
    </IntegrationsAppContext>
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
    <IntegrationsApp
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

export const teardownIntegrations = (coreStart: CoreStart) => {
  coreStart.chrome.docTitle.reset();
  coreStart.chrome.setBreadcrumbs([]);
  licenseService.stop();
};
