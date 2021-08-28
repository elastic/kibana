/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { I18nProvider } from '@kbn/i18n/react';
import React, { lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Redirect, Route, Router, Switch } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import type { CoreStart } from '../../../../../src/core/public/types';
import { ScopedHistory } from '../../../../../src/core/public/application/scoped_history';
import type { ChromeBreadcrumb } from '../../../../../src/core/public/chrome/types';
import type { ChartsPluginStart } from '../../../../../src/plugins/charts/public/types';
import type { DataPublicPluginStart } from '../../../../../src/plugins/data/public/types';
import { EuiThemeProvider } from '../../../../../src/plugins/kibana_react/common/eui_styled_components';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public/context/context';
import { Storage } from '../../../../../src/plugins/kibana_utils/public/storage/storage';
import type { SpacesOssPluginStart } from '../../../../../src/plugins/spaces_oss/public/types';
import type { PluginStartContract as AlertingStart } from '../../../alerting/public/plugin';
import { KibanaFeature } from '../../../features/common/kibana_feature';
import type { SpacesPluginStart } from '../../../spaces/public/plugin';
import { setSavedObjectsClient } from '../common/lib/data_apis';
import type { ActionTypeRegistryContract, RuleTypeRegistryContract } from '../types';
import type { Section } from './constants';
import { legacyRouteToRuleDetails, routeToRuleDetails } from './constants';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';

const TriggersActionsUIHome = lazy(() => import('./home'));
const AlertDetailsRoute = lazy(
  () => import('./sections/alert_details/components/alert_details_route')
);

export interface TriggersAndActionsUiServices extends CoreStart {
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  alerting?: AlertingStart;
  spaces?: SpacesPluginStart;
  spacesOss: SpacesOssPluginStart;
  storage?: Storage;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
  ruleTypeRegistry: RuleTypeRegistryContract;
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
