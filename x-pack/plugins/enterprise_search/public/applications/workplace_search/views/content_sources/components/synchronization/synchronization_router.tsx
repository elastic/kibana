/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import {
  SYNC_FREQUENCY_PATH,
  BLOCKED_TIME_WINDOWS_PATH,
  OBJECTS_AND_ASSETS_PATH,
  SOURCE_SYNCHRONIZATION_PATH,
  getSourcesPath,
} from '../../../../routes';

import { Frequency } from './frequency';
import { ObjectsAndAssets } from './objects_and_assets';
import { Synchronization } from './synchronization';

export const SynchronizationRouter: React.FC = () => (
  <Switch>
    <Route exact path={getSourcesPath(SOURCE_SYNCHRONIZATION_PATH, true)}>
      <Synchronization />
    </Route>
    <Route exact path={getSourcesPath(SYNC_FREQUENCY_PATH, true)}>
      <Frequency tabId={0} />
    </Route>
    <Route exact path={getSourcesPath(BLOCKED_TIME_WINDOWS_PATH, true)}>
      <Frequency tabId={1} />
    </Route>
    <Route exact path={getSourcesPath(OBJECTS_AND_ASSETS_PATH, true)}>
      <ObjectsAndAssets />
    </Route>
  </Switch>
);
