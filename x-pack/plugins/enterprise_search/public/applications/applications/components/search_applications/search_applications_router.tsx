/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
<<<<<<< HEAD

import { Routes, Route } from '@kbn/shared-ux-router';
=======
import { Switch } from 'react-router-dom';

import { Route } from '@kbn/shared-ux-router';
>>>>>>> whats-new

import {
  SEARCH_APPLICATIONS_PATH,
  SEARCH_APPLICATION_CREATION_PATH,
  SEARCH_APPLICATION_PATH,
} from '../../routes';

import { NotFound } from '../not_found';
import { SearchApplicationRouter } from '../search_application/search_application_router';

import { SearchApplicationsList } from './search_applications_list';

export const SearchApplicationsRouter: React.FC = () => {
  return (
<<<<<<< HEAD
    <Routes>
=======
    <Switch>
>>>>>>> whats-new
      <Route exact path={SEARCH_APPLICATIONS_PATH}>
        <SearchApplicationsList />
      </Route>
      <Route path={SEARCH_APPLICATION_CREATION_PATH}>
        <SearchApplicationsList createSearchApplicationFlyoutOpen />
      </Route>
      <Route path={SEARCH_APPLICATION_PATH}>
        <SearchApplicationRouter />
      </Route>
      <Route>
        <NotFound />
      </Route>
<<<<<<< HEAD
    </Routes>
=======
    </Switch>
>>>>>>> whats-new
  );
};
