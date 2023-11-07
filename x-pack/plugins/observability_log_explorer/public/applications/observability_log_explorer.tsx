/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import ReactDOM from 'react-dom';
import { ObservablityLogExplorerMainRoute } from '../routes/main';
import {
  ObservabilityLogExplorerAppMountParameters,
  ObservabilityLogExplorerPluginStart,
  ObservabilityLogExplorerStartDeps,
} from '../types';
import { useKibanaContextForPluginProvider } from '../utils/use_kibana';

export const renderObservabilityLogExplorer = (
  core: CoreStart,
  pluginsStart: ObservabilityLogExplorerStartDeps,
  ownPluginStart: ObservabilityLogExplorerPluginStart,
  appParams: ObservabilityLogExplorerAppMountParameters
) => {
  ReactDOM.render(
    <ObservabilityLogExplorerApp
      appParams={appParams}
      core={core}
      plugins={pluginsStart}
      pluginStart={ownPluginStart}
    />,
    appParams.element
  );

  return () => {
    // work around race condition between unmount effect and current app id
    // observable in the search session service
    pluginsStart.data.search.session.clear();

    ReactDOM.unmountComponentAtNode(appParams.element);
  };
};

export interface ObservabilityLogExplorerAppProps {
  appParams: ObservabilityLogExplorerAppMountParameters;
  core: CoreStart;
  plugins: ObservabilityLogExplorerStartDeps;
  pluginStart: ObservabilityLogExplorerPluginStart;
}

export const ObservabilityLogExplorerApp = ({
  appParams,
  core,
  plugins,
  pluginStart,
}: ObservabilityLogExplorerAppProps) => {
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(
    core,
    plugins,
    pluginStart
  );

  return (
    <KibanaRenderContextProvider i18n={core.i18n} theme={core.theme}>
      <KibanaContextProviderForPlugin>
        <Router history={appParams.history}>
          <Routes>
            <Route
              path="/"
              exact={true}
              render={() => <ObservablityLogExplorerMainRoute appParams={appParams} core={core} />}
            />
          </Routes>
        </Router>
      </KibanaContextProviderForPlugin>
    </KibanaRenderContextProvider>
  );
};
