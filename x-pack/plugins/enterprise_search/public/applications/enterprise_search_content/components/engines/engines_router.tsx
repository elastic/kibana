/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch } from 'react-router-dom';

import { Route } from '@kbn/shared-ux-router';

import { ENGINES_PATH, ENGINE_CREATION_PATH, ENGINE_PATH } from '../../routes';

import { EngineRouter } from '../engine/engine_router';
import { NotFound } from '../not_found';

import { EnginesList } from './engines_list';

export const EnginesRouter: React.FC = () => {
  return (
    <Switch>
      <Route exact path={ENGINES_PATH}>
        <EnginesList />
      </Route>
      <Route path={ENGINE_CREATION_PATH}>
        <EnginesList createEngineFlyoutOpen />
      </Route>
      <Route path={ENGINE_PATH}>
        <EngineRouter />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
};
