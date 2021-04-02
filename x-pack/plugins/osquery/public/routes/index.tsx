/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, Redirect, Route } from 'react-router-dom';

import { LiveQueries } from './live_query';

const OsqueryAppRoutesComponent = () => (
  <Switch>
    {/* <Route path="/packs">
            <Packs />
          </Route>
          <Route path={`/scheduled_queries`}>
            <ScheduledQueries />
          </Route>
          <Route path={`/queries`}>
            <Queries />
          </Route> */}
    <Route path="/live_query">
      <LiveQueries />
    </Route>
    <Redirect to="/live_query" />
  </Switch>
);

export const OsqueryAppRoutes = React.memo(OsqueryAppRoutesComponent);
