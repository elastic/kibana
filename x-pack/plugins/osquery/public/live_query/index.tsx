/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';

import { QueriesPage } from './queries';
import { NewLiveQueryPage } from './new';
import { EditLiveQueryPage } from './edit';

const LiveQueryComponent = () => {
  const match = useRouteMatch();

  return (
    <Switch>
      <Route path={`${match.url}/queries/new`}>
        <NewLiveQueryPage />
      </Route>
      <Route path={`${match.url}/queries/:actionId`}>
        <EditLiveQueryPage />
      </Route>
      <Route path={`${match.url}/queries`}>
        <QueriesPage />
      </Route>
    </Switch>
  );
};

export const LiveQuery = React.memo(LiveQueryComponent);
