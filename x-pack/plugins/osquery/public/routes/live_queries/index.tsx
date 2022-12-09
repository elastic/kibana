/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

import { LiveQueriesPage } from './list';
import { NewLiveQueryPage } from './new';
import { LiveQueryDetailsPage } from './details';
import { useBreadcrumbs } from '../../common/hooks/use_breadcrumbs';
import { useKibana } from '../../common/lib/kibana';
import { MissingPrivileges } from '../components';

const LiveQueriesComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  useBreadcrumbs('live_queries');
  const match = useLocation();

  if (!permissions.readLiveQueries) {
    return <MissingPrivileges />;
  }

  return (
    <Routes>
      <Route path={`${match.pathname}/new`}>
        {(permissions.runSavedQueries && (permissions.readSavedQueries || permissions.readPacks)) ||
        permissions.writeLiveQueries ? (
          <NewLiveQueryPage />
        ) : (
          <MissingPrivileges />
        )}
      </Route>
      <Route path={`${match.pathname}/:actionId`} element={<LiveQueryDetailsPage />} />
      <Route path={`${match.pathname}`} element={<LiveQueriesPage />} />
    </Routes>
  );
};

export const LiveQueries = React.memo(LiveQueriesComponent);
