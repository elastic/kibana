/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { getCoreI18n } from '../kibana_services';
import { createKbnUrlStateStorage } from '../../../../../src/plugins/kibana_utils/public';
import { getStore } from './store_operations';
import { Provider } from 'react-redux';
import { LoadListAndRender } from './routes/list/load_list_and_render';
import { LoadMapAndRender } from './routes/maps_app/load_map_and_render';

export let goToSpecifiedPath;
export let kbnUrlStateStorage;

export async function renderApp(context, { appBasePath, element, history, onAppLeave }) {
  goToSpecifiedPath = (path) => history.push(path);
  kbnUrlStateStorage = createKbnUrlStateStorage({ useHash: false, history });

  render(<App history={history} appBasePath={appBasePath} onAppLeave={onAppLeave} />, element);

  return () => {
    unmountComponentAtNode(element);
  };
}

const App = ({ history, appBasePath, onAppLeave }) => {
  const store = getStore();
  const I18nContext = getCoreI18n().Context;

  return (
    <I18nContext>
      <Provider store={store}>
        <Router basename={appBasePath} history={history}>
          <Switch>
            <Route
              path={`/map/:savedMapId`}
              render={(props) => (
                <LoadMapAndRender
                  savedMapId={props.match.params.savedMapId}
                  onAppLeave={onAppLeave}
                />
              )}
            />
            <Route
              exact
              path={`/map`}
              render={() => <LoadMapAndRender onAppLeave={onAppLeave} />}
            />
            // Redirect other routes to list, or if hash-containing, their non-hash equivalents
            <Route
              path={``}
              render={({ location: { pathname, hash } }) => {
                if (hash) {
                  // Remove leading hash
                  const newPath = hash.substr(1);
                  return <Redirect to={newPath} />;
                } else if (pathname === '/' || pathname === '') {
                  return <LoadListAndRender />;
                } else {
                  return <Redirect to="/" />;
                }
              }}
            />
          </Switch>
        </Router>
      </Provider>
    </I18nContext>
  );
};
