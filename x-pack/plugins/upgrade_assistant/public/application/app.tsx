/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { I18nStart, ScopedHistory } from 'src/core/public';

import { KibanaContextProvider, EuiThemeProvider } from '../shared_imports';
import { AppContextProvider, ContextValue, useAppContext } from './app_context';
import { ComingSoonPrompt } from './components/coming_soon_prompt';
import { EsDeprecationsContent } from './components/es_deprecations';
import { KibanaDeprecationsContent } from './components/kibana_deprecations';
import { DeprecationsOverview } from './components/overview';
import { RedirectAppLinks } from '../../../../../src/plugins/kibana_react/public';

export interface AppDependencies extends ContextValue {
  i18n: I18nStart;
  history: ScopedHistory;
}

const App: React.FunctionComponent = () => {
  const { isReadOnlyMode } = useAppContext();

  // Read-only mode will be enabled up until the last minor before the next major release
  if (isReadOnlyMode) {
    return <ComingSoonPrompt />;
  }

  return (
    <Switch>
      <Route exact path="/overview" component={DeprecationsOverview} />
      <Route exact path="/es_deprecations/:tabName" component={EsDeprecationsContent} />
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

// TODO: for these warnings look at observability app implementation
export const RootComponent = ({
  i18n,
  history,
  startServices,
  startPluginDeps,
  ...contextValue
}: AppDependencies) => {
  return (
    <RedirectAppLinks application={startServices.application}>
      <i18n.Context>
        <EuiThemeProvider>
          <KibanaContextProvider services={{ ...startServices, ...startPluginDeps }}>
            <AppContextProvider value={contextValue}>
              <AppWithRouter history={history} />
            </AppContextProvider>
          </KibanaContextProvider>
        </EuiThemeProvider>
      </i18n.Context>
    </RedirectAppLinks>
  );
};
