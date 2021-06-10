/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HostsContainer } from './pages';
import { hostsPagePath } from './pages/types';
import { SecurityPageName, SecuritySubPluginRoutes } from '../app/types';
import { TrackApplicationView } from '../../../../../src/plugins/usage_collection/public';

export const HostsRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.hosts}>
    <HostsContainer />
  </TrackApplicationView>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: hostsPagePath,
    render: HostsRoutes,
  },
];
