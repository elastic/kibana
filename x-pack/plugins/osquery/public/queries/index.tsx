/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';

import { QueriesPage } from './queries';
import { NewSavedQueryPage } from './new';
import { EditSavedQueryPage } from './edit';
// import { QueryAgentResults } from './agent_results';
// import { SavedQueriesPage } from './saved_query';

const QueriesComponent = () => {
  const match = useRouteMatch();

  return (
    <Switch>
      <Route path={`${match.url}/new`}>
        <NewSavedQueryPage />
      </Route>
      {/* <Route path={`${match.url}/:savedQueryId/results/:agentId`}>
        <QueryAgentResults />
      </Route> */}
      <Route path={`${match.url}/:savedQueryId`}>
        <EditSavedQueryPage />
      </Route>
      <Route path={`${match.url}/`}>
        <QueriesPage />
      </Route>
    </Switch>
  );
};

export const Queries = React.memo(QueriesComponent);
