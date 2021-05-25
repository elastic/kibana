/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, Redirect, Route } from 'react-router-dom';

import { useBreadcrumbs } from '../common/hooks/use_breadcrumbs';
import { LiveQueries } from './live_queries';
import { ScheduledQueryGroups } from './scheduled_query_groups';

const OsqueryAppRoutesComponent = () => {
  useBreadcrumbs('base');

  return (
    <Switch>
      <Route path={`/scheduled_query_groups`}>
        <ScheduledQueryGroups />
      </Route>
      <Route path="/live_queries">
        <LiveQueries />
      </Route>
      <Redirect to="/live_queries" />
    </Switch>
  );
};

export const OsqueryAppRoutes = React.memo(OsqueryAppRoutesComponent);
