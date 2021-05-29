/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';

import { QueriesPage } from './list';
import { NewSavedQueryPage } from './new';
import { EditSavedQueryPage } from './edit';
import { useBreadcrumbs } from '../../common/hooks/use_breadcrumbs';

const SavedQueriesComponent = () => {
  useBreadcrumbs('saved_queries');
  const match = useRouteMatch();

  return (
    <Switch>
      <Route path={`${match.url}/new`}>
        <NewSavedQueryPage />
      </Route>
      <Route path={`${match.url}/:savedQueryId`}>
        <EditSavedQueryPage />
      </Route>
      <Route path={`${match.url}`}>
        <QueriesPage />
      </Route>
    </Switch>
  );
};

export const SavedQueries = React.memo(SavedQueriesComponent);
