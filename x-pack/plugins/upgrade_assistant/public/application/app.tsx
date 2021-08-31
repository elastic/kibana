/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { ScopedHistory } from 'src/core/public';

import { RedirectAppLinks } from '../../../../../src/plugins/kibana_react/public';
import { APP_WRAPPER_CLASS, GlobalFlyout } from '../shared_imports';
import { AppDependencies } from '../types';
import { AppContextProvider, useAppContext } from './app_context';
import { EsDeprecations, ComingSoonPrompt, KibanaDeprecations, Overview } from './components';

const { GlobalFlyoutProvider } = GlobalFlyout;

const App: React.FunctionComponent = () => {
  const { isReadOnlyMode } = useAppContext();

  // Read-only mode will be enabled up until the last minor before the next major release
  if (isReadOnlyMode) {
    return <ComingSoonPrompt />;
  }

  return (
    <Switch>
      <Route exact path="/overview" component={Overview} />
      <Route exact path="/es_deprecations" component={EsDeprecations} />
      <Route exact path="/kibana_deprecations" component={KibanaDeprecations} />
      <Redirect from="/" to="/overview" />
    </Switch>
  );
};

export const AppWithRouter = ({ history }: { history: ScopedHistory }) => {
  return (
    <Router history={history}>
      <App />
    </Router>
  );
};

export const RootComponent = (dependencies: AppDependencies) => {
  const {
    history,
    core: { i18n, application },
  } = dependencies.services;

  return (
    <RedirectAppLinks application={application} className={APP_WRAPPER_CLASS}>
      <i18n.Context>
        <AppContextProvider value={dependencies}>
          <GlobalFlyoutProvider>
            <AppWithRouter history={history} />
          </GlobalFlyoutProvider>
        </AppContextProvider>
      </i18n.Context>
    </RedirectAppLinks>
  );
};
