/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { lazy } from 'react';
import { Switch, Route, Redirect, Router } from 'react-router-dom';
import {
  ToastsSetup,
  ApplicationStart,
  ChromeBreadcrumb,
  CoreStart,
  ScopedHistory,
  SavedObjectsClientContract,
} from 'kibana/public';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { KibanaFeature } from '../../../features/common';
import { Section, routeToAlertDetails } from './constants';
import { ActionTypeRegistryContract, AlertTypeRegistryContract } from '../types';
import { ChartsPluginStart } from '../../../../../src/plugins/charts/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { PluginStartContract as AlertingStart } from '../../../alerts/public';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';

import { setSavedObjectsClient } from '../common/lib/data_apis';
import { KibanaContextProvider } from '../common/lib/kibana';

const TriggersActionsUIHome = lazy(async () => import('./home'));
const AlertDetailsRoute = lazy(
  () => import('./sections/alert_details/components/alert_details_route')
);

export interface TriggersAndActionsUiServices extends CoreStart {
  dataPlugin: DataPublicPluginStart;
  charts: ChartsPluginStart;
  alerts?: AlertingStart;
  navigateToApp: CoreStart['application']['navigateToApp'];
  toastNotifications: ToastsSetup;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  capabilities: ApplicationStart['capabilities'];
  actionTypeRegistry: ActionTypeRegistryContract;
  alertTypeRegistry: AlertTypeRegistryContract;
  history: ScopedHistory;
  kibanaFeatures: KibanaFeature[];
  element: HTMLElement;
  savedObjectsClient: SavedObjectsClientContract;
}

export const renderApp = (deps: TriggersAndActionsUiServices) => {
  const { element, savedObjectsClient } = deps;
  const sections: Section[] = ['alerts', 'connectors'];

  const sectionsRegex = sections.join('|');
  setSavedObjectsClient(savedObjectsClient);

  render(
    <I18nProvider>
      <KibanaContextProvider services={{ ...deps }}>
        <Router history={deps.history}>
          <AppWithoutRouter sectionsRegex={sectionsRegex} />
        </Router>
      </KibanaContextProvider>
    </I18nProvider>,
    element
  );
  return () => {
    unmountComponentAtNode(element);
  };
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
