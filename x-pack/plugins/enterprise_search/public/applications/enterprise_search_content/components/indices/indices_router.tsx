/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { INDICES_PATH, INDEX_PATH, NEW_INDEX_PATH } from '../../routes';

import { IndexDetailRouter } from '../index_detail';
import { NewIndex } from '../new_index';

import { Indices } from './indices';

export const IndicesRouter: React.FC = () => {
  return (
    <Switch>
      <Route exact path={NEW_INDEX_PATH}>
        <NewIndex />
      </Route>
      <Route exact path={INDICES_PATH}>
        <Indices />
      </Route>
      <Route path={INDEX_PATH}>
        <IndexDetailRouter />
      </Route>
    </Switch>
  );
};
