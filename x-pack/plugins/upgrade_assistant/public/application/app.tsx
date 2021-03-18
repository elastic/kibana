/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { I18nStart, ScopedHistory } from 'src/core/public';
import { AppContextProvider, ContextValue } from './app_context';
import { PageContent } from './components/page_content';

export interface AppDependencies extends ContextValue {
  i18n: I18nStart;
  history: ScopedHistory;
}

export const App = ({ history }: { history: ScopedHistory }) => {
  return (
    <Router history={history}>
      <AppWithoutRouter />
    </Router>
  );
};

// Export this so we can test it with a different router.
export const AppWithoutRouter = () => (
  <Switch>
    <Route exact path="/:tabName" component={PageContent} />
    <Redirect from={`/`} to={`/overview`} />
  </Switch>
);

export const RootComponent = ({ i18n, history, ...contextValue }: AppDependencies) => {
  return (
    <i18n.Context>
      <AppContextProvider value={contextValue}>
        <App history={history} />
      </AppContextProvider>
    </i18n.Context>
  );
};
