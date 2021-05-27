/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { Switch, Route, Redirect, Router } from 'react-router-dom';
import { ChromeBreadcrumb, CoreStart, ScopedHistory } from 'kibana/public';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import useObservable from 'react-use/lib/useObservable';
import { KibanaFeature } from '../../../features/common';
import { Section, routeToRuleDetails, legacyRouteToRuleDetails } from './constants';
import { ActionTypeRegistryContract, AlertTypeRegistryContract } from '../types';
import { ChartsPluginStart } from '../../../../../src/plugins/charts/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { PluginStartContract as AlertingStart } from '../../../alerting/public';
import type { SpacesPluginStart } from '../../../spaces/public';

import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { EuiThemeProvider } from '../../../../../src/plugins/kibana_react/common';

import { setSavedObjectsClient } from '../common/lib/data_apis';
import { KibanaContextProvider } from '../common/lib/kibana';

const TriggersActionsUIHome = lazy(() => import('./home'));
const AlertDetailsRoute = lazy(
  () => import('./sections/alert_details/components/alert_details_route')
);

export interface TriggersAndActionsUiServices extends CoreStart {
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  alerting?: AlertingStart;
  spaces?: SpacesPluginStart;
  storage?: Storage;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
  alertTypeRegistry: AlertTypeRegistryContract;
  history: ScopedHistory;
  kibanaFeatures: KibanaFeature[];
  element: HTMLElement;
}

export const renderApp = (deps: TriggersAndActionsUiServices) => {
  const { element } = deps;
  render(<App deps={deps} />, element);
  return () => {
    unmountComponentAtNode(element);
  };
};

export const App = ({ deps }: { deps: TriggersAndActionsUiServices }) => {
  const { savedObjects, uiSettings } = deps;
  const sections: Section[] = ['rules', 'connectors'];
  const isDarkMode = useObservable<boolean>(uiSettings.get$('theme:darkMode'));

  const sectionsRegex = sections.join('|');
  setSavedObjectsClient(savedObjects.client);
  return (
    <I18nProvider>
      <EuiThemeProvider darkMode={isDarkMode}>
        <KibanaContextProvider services={{ ...deps }}>
          <Router history={deps.history}>
            <AppWithoutRouter sectionsRegex={sectionsRegex} />
          </Router>
        </KibanaContextProvider>
      </EuiThemeProvider>
    </I18nProvider>
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
        path={routeToRuleDetails}
        component={suspendedComponentWithProps(AlertDetailsRoute, 'xl')}
      />
      <Route
        exact
        path={legacyRouteToRuleDetails}
        render={({ match }) => <Redirect to={`/rule/${match.params.alertId}`} />}
      />
      <Redirect from={'/'} to="rules" />
      <Redirect from={'/alerts'} to="rules" />
    </Switch>
  );
};
