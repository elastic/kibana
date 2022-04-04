/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { SEARCH_INDICES_PATH, SEARCH_INDEX_PATH } from '../../routes';

import { SearchIndexRouter } from '../search_index';

import { SearchIndices } from './search_indices';

export const SearchIndicesRouter: React.FC = () => {
  return (
    <Switch>
      <Route exact path={SEARCH_INDICES_PATH}>
        <SearchIndices />
      </Route>
      <Route path={SEARCH_INDEX_PATH}>
        <SearchIndexRouter />
      </Route>
    </Switch>
  );
};
