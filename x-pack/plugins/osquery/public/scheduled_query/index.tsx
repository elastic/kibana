/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';

import { ScheduledQueriesPage } from './queries';
import { NewScheduledQueryPage } from './new';
import { EditScheduledQueryPage } from './edit';
// import { QueryAgentResults } from './agent_results';
// import { SavedQueriesPage } from './saved_query';

const ScheduledQueriesComponent = () => {
  const match = useRouteMatch();

  return (
    <Switch>
      <Route path={`${match.url}/new`}>
        <NewScheduledQueryPage />
      </Route>
      {/* <Route path={`${match.url}/:savedQueryId/results/:agentId`}>
        <QueryAgentResults />
      </Route> */}
      <Route path={`${match.url}/:scheduledQueryId`}>
        <EditScheduledQueryPage />
      </Route>
      <Route path={`${match.url}/`}>
        <ScheduledQueriesPage />
      </Route>
    </Switch>
  );
};

export const ScheduledQueries = React.memo(ScheduledQueriesComponent);
