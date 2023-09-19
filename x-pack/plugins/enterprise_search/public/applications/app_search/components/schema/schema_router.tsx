/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { Routes, Route } from '@kbn/shared-ux-router';

import { ENGINE_REINDEX_JOB_PATH } from '../../routes';
import { EngineLogic } from '../engine';

import { ReindexJob } from './reindex_job';
import { Schema, MetaEngineSchema } from './views';

export const SchemaRouter: React.FC = () => {
  const { isMetaEngine } = useValues(EngineLogic);

  return (
    <Routes>
      <Route path={ENGINE_REINDEX_JOB_PATH}>
        <ReindexJob />
      </Route>
      <Route>{isMetaEngine ? <MetaEngineSchema /> : <Schema />}</Route>
    </Routes>
  );
};
