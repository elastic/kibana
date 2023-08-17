/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router } from '@kbn/shared-ux-router';
import { ScopedHistory } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { App } from './app';
import { AppProviders } from './app_providers';
import { AppDependencies } from './app_context';

interface AppWithRouterProps {
  history: ScopedHistory;
}

const AppWithRouter = ({ history }: AppWithRouterProps) => (
  <Router history={history}>
    <App />
  </Router>
);

export const renderApp = (elem: Element, dependencies: AppDependencies) => {
  render(
    <KibanaContextProvider
      services={{
        uiSettings: dependencies.services.uiSettings,
        settings: dependencies.services.settings,
        theme: dependencies.core.theme,
      }}
    >
      <AppProviders appDependencies={dependencies}>
        <AppWithRouter history={dependencies.services.history} />
      </AppProviders>
    </KibanaContextProvider>,
    elem
  );

  return () => {
    unmountComponentAtNode(elem);
  };
};

export type { AppDependencies };
