/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { ScopedHistory } from 'src/core/public';
import { GlobalFlyout } from '../shared_imports';

import { APP_WRAPPER_CLASS } from '../shared_imports';
import { AppContextProvider, useAppContext } from './app_context';
import { ComingSoonPrompt } from './components/coming_soon_prompt';
import { EsDeprecations } from './components/es_deprecations';
import { KibanaDeprecationsContent } from './components/kibana_deprecations';
import { Overview } from './components/overview';
import { RedirectAppLinks } from '../../../../../src/plugins/kibana_react/public';
import { AppDependencies } from '../types';

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
      <Route exact path="/kibana_deprecations" component={KibanaDeprecationsContent} />
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
