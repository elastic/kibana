/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router } from 'react-router-dom';
import { ScopedHistory } from '@kbn/core/public';

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
    <AppProviders appDependencies={dependencies}>
      <AppWithRouter history={dependencies.services.history} />
    </AppProviders>,
    elem
  );

  return () => {
    unmountComponentAtNode(elem);
  };
};

export type { AppDependencies };
