/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { Router, Switch, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { coreMock } from '../../../../../src/core/public/mocks';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import type { CspAppDeps } from '../application/app';

const queryClient = new QueryClient();
const defaultCore = coreMock.createStart();
const defaultParams = coreMock.createAppMountParameters();

export const TestProvider: React.FC<Partial<CspAppDeps>> = ({
  core = defaultCore,
  deps = {},
  params = defaultParams,
  children,
} = {}) => {
  return (
    <KibanaContextProvider services={{ ...deps, ...core }}>
      <QueryClientProvider client={queryClient}>
        <Router history={params.history}>
          <I18nProvider>
            <Switch>
              <Route path="*" render={() => <>{children}</>} />
            </Switch>
          </I18nProvider>
        </Router>
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};
