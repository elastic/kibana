/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { getCoreI18n } from '../kibana_services';
import { MapsListView } from './routes/list_view';
import { MapsCreateEditView } from './routes/create_edit_view';
import { createKbnUrlStateStorage } from '../../../../../src/plugins/kibana_utils/public';
import { useGlobalStateSyncing } from './state_syncing/global_sync';

export function renderApp(context, { appBasePath, element, history }) {
  render(<App history={history} appBasePath={appBasePath} />, element);
  return () => unmountComponentAtNode(element);
}

const App = ({ history, appBasePath }) => {
  const kbnUrlStateStorage = createKbnUrlStateStorage({ useHash: false, history });

  // Init sync utils
  useGlobalStateSyncing(kbnUrlStateStorage);

  const I18nContext = getCoreI18n().Context;
  return (
    <I18nContext>
      <Router basename={appBasePath} history={history}>
        <Switch>
          <Route
            path={`/map/:savedMapId`}
            render={() => <MapsCreateEditView kbnUrlStateStorage={kbnUrlStateStorage} />}
          />
          <Route
            path={`/map`}
            render={() => <MapsCreateEditView kbnUrlStateStorage={kbnUrlStateStorage} />}
          />
          <Route
            path={``}
            render={({ location }) => {
              return location.hash ? (
                <Redirect to={`${appBasePath}${location.hash.replace('#', '')}`} />
              ) : (
                <MapsListView />
              );
            }}
          />
          <Route component={MapsListView} />
        </Switch>
      </Router>
    </I18nContext>
  );
};
