/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter, Switch, Route, Redirect } from 'react-router-dom';
import { WatchStatus } from './sections/watch_status/watch_status';
import { WatchEdit } from './sections/watch_edit/components/watch_edit';
import { WatchList } from './sections/watch_list/components/watch_list';
import { BASE_PATH } from './constants';

export const App = () => {
  return (
    <HashRouter>
      <AppWithoutRouter />
    </HashRouter>
  );
};

// Export this so we can test it with a different router.
export const AppWithoutRouter = () => (
  <Switch>
    <Redirect exact from={`${BASE_PATH}`} to={`${BASE_PATH}watches`} />
    <Route exact path={`${BASE_PATH}watches`} component={WatchList} />
    <Route exact path={`${BASE_PATH}watches/watch/:id/status`} component={WatchStatus} />
    <Route exact path={`${BASE_PATH}watches/watch/:id/edit`} component={WatchEdit} />
    <Route exact path={`${BASE_PATH}watches/new-watch/:type`} component={WatchEdit} />
  </Switch>
);
