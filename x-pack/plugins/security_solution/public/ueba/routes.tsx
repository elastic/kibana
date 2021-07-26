/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UebaContainer } from './pages';

import { TrackApplicationView } from '../../../../../src/plugins/usage_collection/public';
import { SecurityPageName, SecuritySubPluginRoutes } from '../app/types';
import { UEBA_PATH } from '../../common/constants';

export const UebaRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.ueba}>
    <UebaContainer />
  </TrackApplicationView>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: UEBA_PATH,
    render: UebaRoutes,
  },
];
