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
import { useKibana } from '../../common/lib/kibana';
import { MissingPrivileges } from '../components';

const LiveQueriesComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  useBreadcrumbs('live_queries');
  const match = useRouteMatch();

  if (!permissions.readLiveQueries) {
    return <MissingPrivileges />;
  }

  return (
    <Switch>
      <Route path={`${match.url}/new`}>
        {(permissions.runSavedQueries && permissions.readSavedQueries) ||
        permissions.writeLiveQueries ? (
          <NewLiveQueryPage />
        ) : (
          <MissingPrivileges />
        )}
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
