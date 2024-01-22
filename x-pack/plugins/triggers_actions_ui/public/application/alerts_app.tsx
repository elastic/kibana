/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
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
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import {
  ActionTypeRegistryContract,
  AlertsTableConfigurationRegistryContract,
  RuleTypeRegistryContract,
} from '../types';

import { setDataViewsService } from '../common/lib/data_apis';
import { KibanaContextProvider } from '../common/lib/kibana';

const GlobalAlerts = lazy(() => import('./sections/global_alerts'));

export interface TriggersAndActionsUiServices extends CoreStart {
  actions: ActionsPublicPluginSetup;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  dashboard: DashboardStart;
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

export const renderApp = (deps: Partial<TriggersAndActionsUiServices>) => {
  const { element } = deps;
  render(<App deps={deps} />, element);
  return () => {
    unmountComponentAtNode(element);
  };
};

export const App = ({ deps }: { deps: TriggersAndActionsUiServices }) => {
  const { dataViews, uiSettings, theme$ } = deps;
  const isDarkMode = useObservable<boolean>(uiSettings.get$('theme:darkMode'));

  setDataViewsService(dataViews);
  return (
    <I18nProvider>
      <EuiThemeProvider darkMode={isDarkMode}>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider services={{ ...deps }}>
            <Router history={deps.history}>
              <Routes>
                <Route path={`/`} component={suspendedComponentWithProps(GlobalAlerts, 'xl')} />
              </Routes>
            </Router>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </EuiThemeProvider>
    </I18nProvider>
  );
};
