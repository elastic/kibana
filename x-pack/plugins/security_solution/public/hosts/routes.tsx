/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HostsContainer } from './pages';
import { SecurityPageName, SecuritySubPluginRoutes } from '../app/types';
import { TrackApplicationView } from '../../../../../src/plugins/usage_collection/public';
import { HOSTS_PATH } from '../../common/constants';

export const HostsRoutes = ({ plugins }) => (
  <TrackApplicationView viewId={SecurityPageName.hosts}>
    <HostsContainer plugins={plugins} />
  </TrackApplicationView>
);

export const routes: SecuritySubPluginRoutes = (plugins) => [
  {
    path: HOSTS_PATH,
    render: () => <HostsRoutes plugins={plugins} />,
  },
];
