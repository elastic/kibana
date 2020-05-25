/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createBrowserHistory } from 'history';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { getCoreI18n } from '../kibana_services';
import { MapsListView } from './list_view';
import { MapsCreateEditView } from './create_edit_view';

const history = createBrowserHistory();

export function renderApp(context, params) {
  const I18nContext = getCoreI18n().Context;
  render(
    <I18nContext>
      <Router basename={params.appBasePath}>
        <Switch>
          <Route path="/map">
            <MapsCreateEditView />
          </Route>
          <Route path="/">
            <MapsListView />
          </Route>
        </Switch>
      </Router>
    </I18nContext>,
    params.element
  );

  return () => unmountComponentAtNode(params.element);
}
