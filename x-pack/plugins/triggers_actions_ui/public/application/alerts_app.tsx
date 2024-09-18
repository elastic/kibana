/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { render, unmountComponentAtNode } from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import { suspendedComponentWithProps } from './lib/suspended_component_with_props';

import { setDataViewsService } from '../common/lib/data_apis';
import { KibanaContextProvider } from '../common/lib/kibana';
import type { TriggersAndActionsUiServices } from './rules_app';

const StackAlertsPage = lazy(() => import('./sections/alerts_page'));

export const renderApp = (deps: TriggersAndActionsUiServices) => {
  const { element } = deps;
  render(<App deps={deps} />, element);
  return () => {
    unmountComponentAtNode(element);
  };
};

export const App = ({ deps }: { deps: TriggersAndActionsUiServices }) => {
  const { dataViews, i18n, theme } = deps;

  setDataViewsService(dataViews);
  return (
    <KibanaRenderContextProvider i18n={i18n} theme={theme}>
      <KibanaContextProvider services={{ ...deps }}>
        <Router history={deps.history}>
          <Routes>
            <Route path={`/`} component={suspendedComponentWithProps(StackAlertsPage, 'xl')} />
          </Routes>
        </Router>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};
