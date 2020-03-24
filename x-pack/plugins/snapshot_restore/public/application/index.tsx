/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { HashRouter } from 'react-router-dom';

import { App } from './app';
import { AppProviders } from './app_providers';
import { AppDependencies } from './app_context';

const AppWithRouter = () => (
  <HashRouter>
    <App />
  </HashRouter>
);

export const renderApp = (elem: Element, dependencies: AppDependencies) => {
  render(
    <AppProviders appDependencies={dependencies}>
      <AppWithRouter />
    </AppProviders>,
    elem
  );

  return () => {
    unmountComponentAtNode(elem);
  };
};

export { AppDependencies };
