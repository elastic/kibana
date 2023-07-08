/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router } from '@kbn/shared-ux-router';

import { ScopedHistory } from '@kbn/core-application-browser';
import { AppDependencies } from './app_context';
import { AppProviders } from './app_providers';
import { App } from './app';

const AppWithRouter = (props: {
  history: ScopedHistory;
  telemetry: any;
  executionContext: any;
}) => (
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
