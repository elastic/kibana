/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router } from 'react-router-dom';

import { PLUGIN } from '../../common/constants';

import { AppDependencies } from './app_context';
import { AppProviders } from './app_providers';
// @ts-ignore
import { App } from './app.container';

const AppWithRouter = (props: { [key: string]: any }) => (
  <Router history={props.history}>
    <App {...props} />
  </Router>
);

export const renderApp = (element: Element, dependencies: AppDependencies) => {
  dependencies.core.chrome.docTitle.change(PLUGIN.title);
  render(
    <AppProviders appDependencies={dependencies}>
      <AppWithRouter
        telemetry={dependencies.plugins.telemetry}
        history={dependencies.services.history}
      />
    </AppProviders>,
    element
  );

  return () => {
    dependencies.core.chrome.docTitle.reset();
    unmountComponentAtNode(element);
  };
};

export { AppDependencies };
