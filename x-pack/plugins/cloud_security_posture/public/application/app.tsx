/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { Router, Redirect, Switch, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { routes } from './routes';

import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

import type { AppMountParameters, CoreStart } from '../../../../../src/core/public';
import type { AppPluginStartDependencies } from '../types';

const queryClient = new QueryClient();

interface CspAppDeps {
  core: CoreStart;
  deps: AppPluginStartDependencies;
  params: AppMountParameters;
}

export const CspApp = ({ core, deps, params }: CspAppDeps) => {
  return (
    <KibanaContextProvider services={{ ...deps, ...core }}>
      <QueryClientProvider client={queryClient}>
        <Router history={params.history}>
          <I18nProvider>
            <Switch>
              {routes.map((route) => (
                <Route {...route} />
              ))}
              <Route exact path="/" component={() => <Redirect to="/dashboard" />} />
              <Route path="*" component={() => <div>not found</div>} />
            </Switch>
          </I18nProvider>
        </Router>
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};
