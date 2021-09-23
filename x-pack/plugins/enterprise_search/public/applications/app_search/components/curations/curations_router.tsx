/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import {
  ENGINE_CURATIONS_PATH,
  ENGINE_CURATIONS_NEW_PATH,
  ENGINE_CURATION_PATH,
} from '../../routes';

import { Curation } from './curation';
import { Curations, CurationCreation } from './views';

export const CurationsRouter: React.FC = () => {
  return (
    <Switch>
      <Route exact path={ENGINE_CURATIONS_PATH}>
        <Curations />
      </Route>
      <Route exact path={ENGINE_CURATIONS_NEW_PATH}>
        <CurationCreation />
      </Route>
      <Route path={ENGINE_CURATION_PATH}>
        <Curation />
      </Route>
    </Switch>
  );
};
