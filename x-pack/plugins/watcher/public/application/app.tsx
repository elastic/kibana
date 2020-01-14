/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  ChromeStart,
  DocLinksStart,
  HttpSetup,
  ToastsSetup,
  IUiSettingsClient,
} from 'kibana/public';

import {
  HashRouter,
  Switch,
  Route,
  Redirect,
  withRouter,
  RouteComponentProps,
} from 'react-router-dom';
import { WatchStatus } from './sections/watch_status/components/watch_status';
import { WatchEdit } from './sections/watch_edit/components/watch_edit';
import { WatchList } from './sections/watch_list/components/watch_list';
import { registerRouter } from './lib/navigation';
import { BASE_PATH } from './constants';
import { AppContextProvider } from './app_context';
import { DataPublicPluginSetup } from '../../../../../src/plugins/data/public';

const ShareRouter = withRouter(({ children, history }: RouteComponentProps & { children: any }) => {
  registerRouter({ history });
  return children;
});

export interface AppDeps {
  data: DataPublicPluginSetup;
  chrome: ChromeStart;
  docLinks: DocLinksStart;
  toasts: ToastsSetup;
  http: HttpSetup;
  uiSettings: IUiSettingsClient;
  euiUtils: any;
  TimeBuckets: any;
  MANAGEMENT_BREADCRUMB: any;
}

export const App = (deps: AppDeps) => {
  return (
    <HashRouter>
      <ShareRouter>
        <AppContextProvider value={deps}>
          <AppWithoutRouter />
        </AppContextProvider>
      </ShareRouter>
    </HashRouter>
  );
};

// Export this so we can test it with a different router.
export const AppWithoutRouter = () => (
  <Switch>
    <Route exact path={`${BASE_PATH}watches`} component={WatchList} />
    <Route exact path={`${BASE_PATH}watches/watch/:id/status`} component={WatchStatus} />
    <Route exact path={`${BASE_PATH}watches/watch/:id/edit`} component={WatchEdit} />
    <Route
      exact
      path={`${BASE_PATH}watches/new-watch/:type(json|threshold)`}
      component={WatchEdit}
    />
    <Redirect from={BASE_PATH} to={`${BASE_PATH}watches`} />
  </Switch>
);
