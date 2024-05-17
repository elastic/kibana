/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, Routes } from '@kbn/shared-ux-router';
import React from 'react';
import { Redirect } from 'react-router-dom';

import { useBreadcrumbs } from '../common/hooks/use_breadcrumbs';
import { LiveQueries } from './live_queries';
import { Packs } from './packs';
import { SavedQueries } from './saved_queries';

const OsqueryAppRoutesComponent = () => {
  useBreadcrumbs('base');

  return (
    <Routes>
      <Route path={`/packs`}>
        <Packs />
      </Route>
      <Route path={`/saved_queries`}>
        <SavedQueries />
      </Route>
      <Route path="/live_queries">
        <LiveQueries />
      </Route>
      <Redirect to="/live_queries" />
    </Routes>
  );
};

export const OsqueryAppRoutes = React.memo(OsqueryAppRoutesComponent);
