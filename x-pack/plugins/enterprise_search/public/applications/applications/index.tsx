/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import { NotFound } from './components/not_found';
import { PlaygroundRedirect } from './components/playground_redirect';
import { SearchApplicationsRouter } from './components/search_applications/search_applications_router';
import { ROOT_PATH, SEARCH_APPLICATIONS_PATH } from './routes';

export const Applications = () => {
  return (
    <Routes>
      <Route exact path={ROOT_PATH} component={PlaygroundRedirect} />
      <Route path={SEARCH_APPLICATIONS_PATH} component={SearchApplicationsRouter} />
      <Route>
        <NotFound />
      </Route>
    </Routes>
  );
};
