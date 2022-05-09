/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { Timelines } from './pages';
import { TIMELINES_PATH } from '../../common/constants';

import { SecurityPageName, SecuritySubPluginRoutes } from '../app/types';

const TimelinesRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.timelines}>
    <Timelines />
  </TrackApplicationView>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: TIMELINES_PATH,
    render: TimelinesRoutes,
  },
];
