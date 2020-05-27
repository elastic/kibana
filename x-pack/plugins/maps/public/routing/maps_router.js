/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { BrowserRouter as Router, Switch, Route, Redirect } from 'react-router-dom';
import { getCoreI18n } from '../kibana_services';
import { MapsListView } from './list_view';
import { MapsCreateEditView } from './create_edit_view';

export function renderApp(context, { appBasePath, element }) {
  const I18nContext = getCoreI18n().Context;
  render(
    <I18nContext>
      <Router>
        <Switch>
          <Route path={`${appBasePath}/map/:savedMapId`} component={MapsCreateEditView} />
          <Route path={`${appBasePath}/map`} component={MapsCreateEditView} />
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
    </I18nContext>,
    element
  );

  return () => unmountComponentAtNode(element);
}
