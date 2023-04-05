/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch } from 'react-router-dom';

import { Route } from '@kbn/shared-ux-router';

import { NotFound } from '../../../enterprise_search_content/components/not_found';

import { SEARCH_APPLICATION_PATH, SEARCH_APPLICATIONS_PATH } from '../../routes';
import { EngineRouter } from '../search_application/router';

import { EnginesList } from './engines_list';

export const SearchApplicationsRouter = () => {
  return (
    <Switch>
      <Route exact path={SEARCH_APPLICATIONS_PATH}>
        <EnginesList />
      </Route>
      <Route path={SEARCH_APPLICATION_PATH}>
        <EngineRouter />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
};
