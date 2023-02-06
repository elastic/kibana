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
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { PluginStartContract as AlertingStart } from '@kbn/alerting-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import { ruleDetailsRoute } from '@kbn/rule-data-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import {
  ActionTypeRegistryContract,
  AlertsTableConfigurationRegistryContract,
  RuleTypeRegistryContract,
} from '../types';
import { Section, legacyRouteToRuleDetails, routeToConnectors } from './constants';

import { setDataViewsService } from '../common/lib/data_apis';
import { KibanaContextProvider, useKibana } from '../common/lib/kibana';
import { ConnectorProvider } from './context/connector_context';
import { CONNECTORS_PLUGIN_ID } from '../common/constants';

const TriggersActionsUIHome = lazy(() => import('./home'));
const RuleDetailsRoute = lazy(
  () => import('./sections/rule_details/components/rule_details_route')
);
const queryClient = new QueryClient();

export interface TriggersAndActionsUiServices extends CoreStart {
  actions: ActionsPublicPluginSetup;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
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
  const { dataViews, uiSettings, theme$ } = deps;
  const sections: Section[] = ['rules', 'logs', 'alerts'];
  const isDarkMode = useObservable<boolean>(uiSettings.get$('theme:darkMode'));

  const sectionsRegex = sections.join('|');
  setDataViewsService(dataViews);
  return (
    <I18nProvider>
      <EuiThemeProvider darkMode={isDarkMode}>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider services={{ ...deps }}>
            <Router history={deps.history}>
              <QueryClientProvider client={queryClient}>
                <AppWithoutRouter sectionsRegex={sectionsRegex} />
              </QueryClientProvider>
            </Router>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </EuiThemeProvider>
    </I18nProvider>
  );
};

export const AppWithoutRouter = ({ sectionsRegex }: { sectionsRegex: string }) => {
  const {
    actions: { validateEmailAddresses },
    application: { navigateToApp },
  } = useKibana().services;

  return (
    <ConnectorProvider value={{ services: { validateEmailAddresses } }}>
      <Switch>
        <Route
          path={`/:section(${sectionsRegex})`}
          component={suspendedComponentWithProps(TriggersActionsUIHome, 'xl')}
        />
        <Route
          path={ruleDetailsRoute}
          component={suspendedComponentWithProps(RuleDetailsRoute, 'xl')}
        />
        <Route
          exact
          path={legacyRouteToRuleDetails}
          render={({ match }) => <Redirect to={`/rule/${match.params.alertId}`} />}
        />
        <Route
          exact
          path={routeToConnectors}
          render={() => {
            navigateToApp(`management/insightsAndAlerting/${CONNECTORS_PLUGIN_ID}`);
            return null;
          }}
        />

        <Redirect from={'/'} to="rules" />
        <Redirect from={'/alerts'} to="rules" />
      </Switch>
    </ConnectorProvider>
  );
};
