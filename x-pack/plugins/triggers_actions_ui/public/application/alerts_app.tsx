/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';

import { setDataViewsService } from '../common/lib/data_apis';
import { KibanaContextProvider } from '../common/lib/kibana';
import type { TriggersAndActionsUiServices } from './app';

const GlobalAlertsPage = lazy(() => import('./sections/global_alerts_page'));

export const renderApp = (deps: TriggersAndActionsUiServices) => {
  const { element } = deps;
  render(<App deps={deps} />, element);
  return () => {
    unmountComponentAtNode(element);
  };
};

export const App = ({ deps }: { deps: TriggersAndActionsUiServices }) => {
  const { dataViews, theme, theme$ } = deps;
  const isDarkMode = theme.getTheme().darkMode;

  setDataViewsService(dataViews);
  return (
    <I18nProvider>
      <EuiThemeProvider darkMode={isDarkMode}>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider services={{ ...deps }}>
            <Router history={deps.history}>
              <Routes>
                <Route path={`/`} component={suspendedComponentWithProps(GlobalAlertsPage, 'xl')} />
              </Routes>
            </Router>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </EuiThemeProvider>
    </I18nProvider>
  );
};
