/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Switch, Route, Redirect } from 'react-router-dom';
import { getCoreI18n } from '../kibana_services';
import { MapsListView } from './routes/list';
import { MapsCreateEditView } from './routes/create_edit';
import { createKbnUrlStateStorage } from '../../../../../src/plugins/kibana_utils/public';
import { getStore } from './store_operations';
import { Provider } from 'react-redux';
import { getMapsSavedObjectLoader } from '../angular/services/gis_map_saved_object_loader';

export let returnToMapsList;

export async function renderApp(context, { appBasePath, element, history }) {
  const { hits = [] } = await getMapsSavedObjectLoader().find();
  const hasSavedMaps = !!hits.length;
  returnToMapsList = () => history.push('/');

  render(<App history={history} appBasePath={appBasePath} hasSavedMaps={hasSavedMaps} />, element);

  return () => unmountComponentAtNode(element);
}

const App = ({ history, appBasePath, hasSavedMaps }) => {
  const kbnUrlStateStorage = createKbnUrlStateStorage({ useHash: false, history });
  const store = getStore();

  const I18nContext = getCoreI18n().Context;
  return (
    <I18nContext>
      <Provider store={store}>
        <Router basename={appBasePath} history={history}>
          <Switch>
            <Route
              path={`/map/:savedMapId`}
              render={() =>
                hasSavedMaps ? (
                  <MapsCreateEditView kbnUrlStateStorage={kbnUrlStateStorage} />
                ) : (
                  <Redirect to={`/map`} />
                )
              }
            />
            <Route
              exact
              path={`/map`}
              render={() => <MapsCreateEditView kbnUrlStateStorage={kbnUrlStateStorage} />}
            />
            <Route exact path={`/`} component={MapsListView} />
            <Route component={MapsListView} />
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
