/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { Switch, Route, Redirect, HashRouter } from 'react-router-dom';
import {
  ChromeStart,
  DocLinksStart,
  ToastsSetup,
  HttpSetup,
  IUiSettingsClient,
  ApplicationStart,
  ChromeBreadcrumb,
  CoreStart,
} from 'kibana/public';
import { BASE_PATH, Section, routeToAlertDetails } from './constants';
import { TriggersActionsUIHome } from './home';
import { AppContextProvider, useAppDependencies } from './app_context';
import { hasShowAlertsCapability } from './lib/capabilities';
import { ActionTypeModel, AlertTypeModel } from '../types';
import { TypeRegistry } from './type_registry';
import { AlertDetailsRouteWithApi as AlertDetailsRoute } from './sections/alert_details/components/alert_details_route';
import { ChartsPluginStart } from '../../../../../src/plugins/charts/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { PluginStartContract as AlertingStart } from '../../../alerting/public';

export interface AppDeps {
  dataPlugin: DataPublicPluginStart;
  charts: ChartsPluginStart;
  chrome: ChromeStart;
  alerting?: AlertingStart;
  navigateToApp: CoreStart['application']['navigateToApp'];
  docLinks: DocLinksStart;
  toastNotifications: ToastsSetup;
  http: HttpSetup;
  uiSettings: IUiSettingsClient;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  capabilities: ApplicationStart['capabilities'];
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
}

export const App = (appDeps: AppDeps) => {
  const sections: Section[] = ['alerts', 'connectors'];

  const sectionsRegex = sections.join('|');

  return (
    <HashRouter>
      <AppContextProvider appDeps={appDeps}>
        <AppWithoutRouter sectionsRegex={sectionsRegex} />
      </AppContextProvider>
    </HashRouter>
  );
};

export const AppWithoutRouter = ({ sectionsRegex }: { sectionsRegex: string }) => {
  const { capabilities } = useAppDependencies();
  const canShowAlerts = hasShowAlertsCapability(capabilities);
  const DEFAULT_SECTION: Section = canShowAlerts ? 'alerts' : 'connectors';
  return (
    <Switch>
      <Route path={`${BASE_PATH}/:section(${sectionsRegex})`} component={TriggersActionsUIHome} />
      {canShowAlerts && <Route path={routeToAlertDetails} component={AlertDetailsRoute} />}
      <Redirect from={`${BASE_PATH}`} to={`${BASE_PATH}/${DEFAULT_SECTION}`} />
    </Switch>
  );
};
