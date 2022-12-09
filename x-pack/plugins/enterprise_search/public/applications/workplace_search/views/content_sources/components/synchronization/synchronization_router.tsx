/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import {
  SYNC_FREQUENCY_PATH,
  BLOCKED_TIME_WINDOWS_PATH,
  ASSETS_AND_OBJECTS_PATH,
  SOURCE_SYNCHRONIZATION_PATH,
  getSourcesPath,
  OLD_OBJECTS_AND_ASSETS_PATH,
} from '../../../../routes';

import { AssetsAndObjects } from './assets_and_objects';
import { Frequency } from './frequency';
import { Synchronization } from './synchronization';

export const SynchronizationRouter: React.FC = () => (
  <Routes>
    <Route path={getSourcesPath(SOURCE_SYNCHRONIZATION_PATH, true)} element={<Synchronization />} />
    <Route path={getSourcesPath(SYNC_FREQUENCY_PATH, true)} element={<Frequency tabId={0} />} />
    <Route
      path={getSourcesPath(BLOCKED_TIME_WINDOWS_PATH, true)}
      element={<Frequency tabId={1} />}
    />
    <Route path={getSourcesPath(ASSETS_AND_OBJECTS_PATH, true)} element={<AssetsAndObjects />} />
    <Route
      path={getSourcesPath(OLD_OBJECTS_AND_ASSETS_PATH, true)}
      element={<Navigate to={getSourcesPath(ASSETS_AND_OBJECTS_PATH, true)} />}
    />
  </Routes>
);
