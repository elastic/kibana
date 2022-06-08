/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import {
  INDEX_OVERVIEW_PATH,
  INDEX_DOCUMENTS_PATH,
  INDEX_SCHEMA_PATH,
  INDEX_LOGS_PATH,
} from '../../routes';

import { IndexDocuments } from './documents';
import { IndexLogs } from './logs';
import { IndexOverview } from './overview';
import { IndexSchema } from './schema';

export const IndexDetailRouter: React.FC = () => {
  return (
    <Switch>
      <Route exact path={INDEX_OVERVIEW_PATH}>
        <IndexOverview />
      </Route>
      <Route exact path={INDEX_DOCUMENTS_PATH}>
        <IndexDocuments />
      </Route>
      <Route exact path={INDEX_SCHEMA_PATH}>
        <IndexSchema />
      </Route>
      <Route exact path={INDEX_LOGS_PATH}>
        <IndexLogs />
      </Route>
    </Switch>
  );
};
