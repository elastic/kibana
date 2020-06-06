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
import { LoadMapAndRender } from './routes/create_edit/load_map_and_render';

export let returnToMapsList;
export let goToSpecifiedPath;
export let kbnUrlStateStorage;

export async function renderApp(context, { appBasePath, element, history }) {
  returnToMapsList = () => history.push('/');
  goToSpecifiedPath = (path) => history.push(path);
  kbnUrlStateStorage = createKbnUrlStateStorage({ useHash: false, history });

  render(<App history={history} appBasePath={appBasePath} />, element);

  return () => {
    unmountComponentAtNode(element);
  };
}

const App = ({ history, appBasePath }) => {
  const store = getStore();

  const I18nContext = getCoreI18n().Context;
  return (
    <I18nContext>
      <Provider store={store}>
        <Router basename={appBasePath} history={history}>
          <Switch>
            <Route path={`/map/:savedMapId`} component={LoadMapAndRender} />
            <Route exact path={`/map`} component={LoadMapAndRender} />
            <Route exact path={`/`} component={LoadListAndRender} />
            // Redirect other routes to list, or if hash-containing, their
            // non-hash equivalents
            <Route
              path={``}
              render={({ location }) => {
                return location.hash ? (
                  <Redirect to={`${appBasePath}${location.hash.replace('#', '')}`} />
                ) : (
                  <Redirect to="/" />
                );
              }}
            />
          </Switch>
        </Router>
      </Provider>
    </I18nContext>
  );
};
