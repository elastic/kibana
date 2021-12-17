/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { Switch, Route, Redirect, Router } from 'react-router-dom';
import { ChromeBreadcrumb, CoreStart, CoreTheme, ScopedHistory } from 'kibana/public';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { Observable } from 'rxjs';
import { KibanaFeature } from '../../../features/common';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';
import { Section, routeToRuleDetails, legacyRouteToRuleDetails } from './constants';
import { ActionTypeRegistryContract, RuleTypeRegistryContract } from '../types';
import { ChartsPluginStart } from '../../../../../src/plugins/charts/public';
import { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import { PluginStartContract as AlertingStart } from '../../../alerting/public';
import type { SpacesPluginStart } from '../../../spaces/public';

import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';

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
  isCloud: boolean;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
  ruleTypeRegistry: RuleTypeRegistryContract;
  history: ScopedHistory;
  kibanaFeatures: KibanaFeature[];
  element: HTMLElement;
  theme$: Observable<CoreTheme>;
}

export const renderApp = (deps: TriggersAndActionsUiServices) => {
  const { element } = deps;
  render(<App deps={deps} />, element);
  return () => {
    unmountComponentAtNode(element);
  };
};

export const App = ({ deps }: { deps: TriggersAndActionsUiServices }) => {
  const { savedObjects, theme$ } = deps;
  const sections: Section[] = ['rules', 'connectors'];

  const sectionsRegex = sections.join('|');
  setSavedObjectsClient(savedObjects.client);
  return (
    <I18nProvider>
      <KibanaThemeProvider theme$={theme$}>
        <KibanaContextProvider services={{ ...deps }}>
          <Router history={deps.history}>
            <AppWithoutRouter sectionsRegex={sectionsRegex} />
          </Router>
        </KibanaContextProvider>
      </KibanaThemeProvider>
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
