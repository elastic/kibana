/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { lazy } from 'react';
import { Switch, Route, Redirect, Router } from 'react-router-dom';
import {
  ChromeStart,
  DocLinksStart,
  ToastsSetup,
  HttpSetup,
  IUiSettingsClient,
  ApplicationStart,
  ChromeBreadcrumb,
  CoreStart,
  ScopedHistory,
  SavedObjectsClientContract,
} from 'kibana/public';
import { KibanaFeature } from '../../../features/common';
import { Section, routeToAlertDetails } from './constants';
import { AppContextProvider } from './app_context';
import { ActionTypeRegistryContract, AlertTypeRegistryContract } from '../types';
import { ChartsPluginStart } from '../../../../../src/plugins/charts/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { PluginStartContract as AlertingStart } from '../../../alerts/public';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';

const TriggersActionsUIHome = lazy(async () => import('./home'));
const AlertDetailsRoute = lazy(
  () => import('./sections/alert_details/components/alert_details_route')
);

export interface AppDeps {
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  chrome: ChromeStart;
  alerts?: AlertingStart;
  navigateToApp: CoreStart['application']['navigateToApp'];
  docLinks: DocLinksStart;
  toastNotifications: ToastsSetup;
  storage?: Storage;
  http: HttpSetup;
  uiSettings: IUiSettingsClient;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  capabilities: ApplicationStart['capabilities'];
  actionTypeRegistry: ActionTypeRegistryContract;
  alertTypeRegistry: AlertTypeRegistryContract;
  history: ScopedHistory;
  savedObjects?: {
    client: SavedObjectsClientContract;
  };
  kibanaFeatures: KibanaFeature[];
}

export const App = (appDeps: AppDeps) => {
  const sections: Section[] = ['alerts', 'connectors'];

  const sectionsRegex = sections.join('|');

  return (
    <Router history={appDeps.history}>
      <AppContextProvider appDeps={appDeps}>
        <AppWithoutRouter sectionsRegex={sectionsRegex} />
      </AppContextProvider>
    </Router>
  );
};

export const AppWithoutRouter = ({ sectionsRegex }: { sectionsRegex: string }) => {
  return (
    <Switch>
      <Route
        path={`/:section(${sectionsRegex})`}
        component={suspendedComponentWithProps(TriggersActionsUIHome, 'xl')}
      />
      <Route
        path={routeToAlertDetails}
        component={suspendedComponentWithProps(AlertDetailsRoute, 'xl')}
      />
      <Redirect from={'/'} to="alerts" />
    </Switch>
  );
};
