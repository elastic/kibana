/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, CoreStart, ScopedHistory } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import ReactDOM from 'react-dom';
import { ObservablityLogExplorerMainRoute } from '../routes/main';
import { ObservabilityLogExplorerPluginStart, ObservabilityLogExplorerStartDeps } from '../types';

export const renderObservabilityLogExplorer = (
  core: CoreStart,
  pluginsStart: ObservabilityLogExplorerStartDeps,
  ownPluginStart: ObservabilityLogExplorerPluginStart,
  { element, history }: AppMountParameters
) => {
  ReactDOM.render(
    <ObservabilityLogExplorerApp
      core={core}
      history={history}
      plugins={pluginsStart}
      pluginStart={ownPluginStart}
    />,
    element
  );

  return () => {
    // work around race condition between unmount effect and current app id
    // observable in the search session service
    pluginsStart.data.search.session.clear();

    ReactDOM.unmountComponentAtNode(element);
  };
};

export interface ObservabilityLogExplorerAppProps {
  core: CoreStart;
  plugins: ObservabilityLogExplorerStartDeps;
  pluginStart: ObservabilityLogExplorerPluginStart;
  history: ScopedHistory;
}

export const ObservabilityLogExplorerApp = ({
  core: { i18n, theme },
  plugins: { logExplorer },
  pluginStart,
  history,
}: ObservabilityLogExplorerAppProps) => (
  <KibanaRenderContextProvider i18n={i18n} theme={theme}>
    <Router history={history}>
      <Routes>
        <Route
          path="/"
          exact={true}
          render={() => (
            <ObservablityLogExplorerMainRoute history={history} logExplorer={logExplorer} />
          )}
        />
      </Routes>
    </Router>
  </KibanaRenderContextProvider>
);
