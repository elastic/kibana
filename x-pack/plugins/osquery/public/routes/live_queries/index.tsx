/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';

import { LiveQueriesPage } from './list';
import { NewLiveQueryPage } from './new';
import { LiveQueryDetailsPage } from './details';
import { useBreadcrumbs } from '../../common/hooks/use_breadcrumbs';

const LiveQueriesComponent = () => {
  useBreadcrumbs('live_queries');
  const match = useRouteMatch();

  return (
    <Switch>
      <Route path={`${match.url}/new`}>
        <NewLiveQueryPage />
      </Route>
      <Route path={`${match.url}/:actionId`}>
        <LiveQueryDetailsPage />
      </Route>
      <Route path={`${match.url}`}>
        <LiveQueriesPage />
      </Route>
    </Switch>
  );
};

export const LiveQueries = React.memo(LiveQueriesComponent);
