/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { Switch, Route, Redirect, Router } from 'react-router-dom';
import { ChromeBreadcrumb, CoreStart, CoreTheme, ScopedHistory } from '@kbn/core/public';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { Observable } from 'rxjs';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { PluginStartContract as AlertingStart } from '@kbn/alerting-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import {
  ActionTypeRegistryContract,
  AlertsTableConfigurationRegistryContract,
  RuleTypeRegistryContract,
} from '../types';
import { Section, routeToRuleDetails, legacyRouteToRuleDetails } from './constants';

import { setSavedObjectsClient } from '../common/lib/data_apis';
import { KibanaContextProvider } from '../common/lib/kibana';

const TriggersActionsUIHome = lazy(() => import('./home'));
const RuleDetailsRoute = lazy(
  () => import('./sections/rule_details/components/rule_details_route')
);

export interface TriggersAndActionsUiServices extends CoreStart {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  charts: ChartsPluginStart;
  alerting?: AlertingStart;
  spaces?: SpacesPluginStart;
  storage?: Storage;
  isCloud: boolean;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
  ruleTypeRegistry: RuleTypeRegistryContract;
  alertsTableConfigurationRegistry: AlertsTableConfigurationRegistryContract;
  history: ScopedHistory;
  kibanaFeatures: KibanaFeature[];
  element: HTMLElement;
  theme$: Observable<CoreTheme>;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export const renderApp = (deps: TriggersAndActionsUiServices) => {
  const { element } = deps;
  render(<App deps={deps} />, element);
  return () => {
    unmountComponentAtNode(element);
  };
};

export const App = ({ deps }: { deps: TriggersAndActionsUiServices }) => {
  const { savedObjects, uiSettings, theme$ } = deps;
  const sections: Section[] = ['rules', 'connectors', 'alerts'];
  const isDarkMode = useObservable<boolean>(uiSettings.get$('theme:darkMode'));

  const sectionsRegex = sections.join('|');
  setSavedObjectsClient(savedObjects.client);
  return (
    <I18nProvider>
      <EuiThemeProvider darkMode={isDarkMode}>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider services={{ ...deps }}>
            <Router history={deps.history}>
              <AppWithoutRouter sectionsRegex={sectionsRegex} />
            </Router>
          </KibanaContextProvider>
        </KibanaThemeProvider>
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
        component={suspendedComponentWithProps(RuleDetailsRoute, 'xl')}
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
