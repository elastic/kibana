/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch } from 'react-router-dom';

import { Route } from '@kbn/shared-ux-router';

import {
  SEARCH_APPLICATIONS_PATH,
  SEARCH_APPLICATION_CREATION_PATH,
  SEARCH_APPLICATION_PATH,
} from '../../routes';

import { EngineRouter } from '../engine/engine_router';
import { NotFound } from '../not_found';

import { EnginesList } from './engines_list';

export const EnginesRouter: React.FC = () => {
  return (
    <Switch>
      <Route exact path={SEARCH_APPLICATIONS_PATH}>
        <EnginesList />
      </Route>
      <Route path={SEARCH_APPLICATION_CREATION_PATH}>
        <EnginesList createEngineFlyoutOpen />
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
