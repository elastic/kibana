/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import {
  SEARCH_INDEX_OVERVIEW_PATH,
  SEARCH_INDEX_DOCUMENTS_PATH,
  SEARCH_INDEX_SCHEMA_PATH,
  SEARCH_INDEX_LOGS_PATH,
} from '../../routes';

import { SearchIndexDocuments } from './documents';
import { SearchIndexLogs } from './logs';
import { SearchIndexOverview } from './overview';
import { SearchIndexSchema } from './schema';

export const SearchIndexRouter: React.FC = () => {
  return (
    <Switch>
      <Route exact path={SEARCH_INDEX_OVERVIEW_PATH}>
        <SearchIndexOverview />
      </Route>
      <Route exact path={SEARCH_INDEX_DOCUMENTS_PATH}>
        <SearchIndexDocuments />
      </Route>
      <Route exact path={SEARCH_INDEX_SCHEMA_PATH}>
        <SearchIndexSchema />
      </Route>
      <Route exact path={SEARCH_INDEX_LOGS_PATH}>
        <SearchIndexLogs />
      </Route>
    </Switch>
  );
};
