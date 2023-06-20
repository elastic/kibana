/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, Switch } from 'react-router-dom';

import { Route } from '@kbn/shared-ux-router';

import { EnginesRouter } from './components/engines/engines_router';
import { NotFound } from './components/not_found';
import { ROOT_PATH, ENGINES_PATH } from './routes';

export const Applications = () => {
  return (
    <Switch>
      <Redirect exact from={ROOT_PATH} to={ENGINES_PATH} />
      <Route path={ENGINES_PATH}>
        <EnginesRouter />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
};
