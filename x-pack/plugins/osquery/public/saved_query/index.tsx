/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';

import { SavedQueriesPage } from './queries';
import { NewSavedQueryPage } from './new';
import { EditSavedQueryPage } from './edit';
// import { QueryAgentResults } from './agent_results';
// import { SavedQueriesPage } from './saved_query';

const SavedQueryComponent = () => {
  const match = useRouteMatch();

  return (
    <Switch>
      <Route path={`${match.url}/queries/new`}>
        <NewSavedQueryPage />
      </Route>
      {/* <Route path={`${match.url}/queries/:savedQueryId/results/:agentId`}>
        <QueryAgentResults />
      </Route> */}
      <Route path={`${match.url}/queries/:savedQueryId`}>
        <EditSavedQueryPage />
      </Route>
      <Route path={`${match.url}/queries`}>
        <SavedQueriesPage />
      </Route>
    </Switch>
  );
};

export const SavedQuery = React.memo(SavedQueryComponent);
