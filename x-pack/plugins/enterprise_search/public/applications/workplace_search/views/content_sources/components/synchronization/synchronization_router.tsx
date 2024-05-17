/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';

import { Route, Routes } from '@kbn/shared-ux-router';

import {
  ASSETS_AND_OBJECTS_PATH,
  BLOCKED_TIME_WINDOWS_PATH,
  OLD_OBJECTS_AND_ASSETS_PATH,
  SOURCE_SYNCHRONIZATION_PATH,
  SYNC_FREQUENCY_PATH,
  getSourcesPath,
} from '../../../../routes';

import { AssetsAndObjects } from './assets_and_objects';
import { Frequency } from './frequency';
import { Synchronization } from './synchronization';

export const SynchronizationRouter: React.FC = () => (
  <Routes>
    <Route exact path={getSourcesPath(SOURCE_SYNCHRONIZATION_PATH, true)}>
      <Synchronization />
    </Route>
    <Route exact path={getSourcesPath(SYNC_FREQUENCY_PATH, true)}>
      <Frequency tabId={0} />
    </Route>
    <Route exact path={getSourcesPath(BLOCKED_TIME_WINDOWS_PATH, true)}>
      <Frequency tabId={1} />
    </Route>
    <Route exact path={getSourcesPath(ASSETS_AND_OBJECTS_PATH, true)}>
      <AssetsAndObjects />
    </Route>
    <Redirect
      from={getSourcesPath(OLD_OBJECTS_AND_ASSETS_PATH, true)}
      to={getSourcesPath(ASSETS_AND_OBJECTS_PATH, true)}
    />
  </Routes>
);
