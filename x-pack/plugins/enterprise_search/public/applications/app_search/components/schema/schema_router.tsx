/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { useValues } from 'kea';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { ENGINE_REINDEX_JOB_PATH } from '../../routes';
import { EngineLogic, getEngineBreadcrumbs } from '../engine';

import { SCHEMA_TITLE } from './constants';
import { ReindexJob } from './reindex_job';
import { Schema, MetaEngineSchema } from './views';

export const SchemaRouter: React.FC = () => {
  const { isMetaEngine } = useValues(EngineLogic);
  const schemaBreadcrumb = getEngineBreadcrumbs([SCHEMA_TITLE]);

  return (
    <Switch>
      <Route path={ENGINE_REINDEX_JOB_PATH}>
        <ReindexJob schemaBreadcrumb={schemaBreadcrumb} />
      </Route>
      <Route>
        <SetPageChrome trail={schemaBreadcrumb} />
        {isMetaEngine ? <MetaEngineSchema /> : <Schema />}
      </Route>
    </Switch>
  );
};
