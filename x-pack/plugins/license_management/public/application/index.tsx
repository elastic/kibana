/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Router } from '@kbn/shared-ux-router';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

// @ts-ignore
import { App } from './app.container';
import { AppDependencies } from './app_context';
import { AppProviders } from './app_providers';

const AppWithRouter = (props: { [key: string]: any }) => (
  <Router history={props.history}>
    <App {...props} />
  </Router>
);

export const renderApp = (element: Element, dependencies: AppDependencies) => {
  render(
    <AppProviders appDependencies={dependencies}>
      <AppWithRouter
        telemetry={dependencies.plugins.telemetry}
        history={dependencies.services.history}
        executionContext={dependencies.core.executionContext}
      />
    </AppProviders>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};

export type { AppDependencies };
