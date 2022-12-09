/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { UsersContainer } from './users/pages';
import { HostsContainer } from './hosts/pages';
import { NetworkContainer } from './network/pages';

import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityPageName } from '../app/types';
import { HOSTS_PATH, NETWORK_PATH, USERS_PATH } from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

export const NetworkRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.network}>
      <NetworkContainer />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const UsersRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.users}>
      <UsersContainer />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const HostsRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.hosts}>
      <HostsContainer />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const networkRoutes: SecuritySubPluginRoutes = [
  {
    path: NETWORK_PATH,
    component: NetworkRoutes,
  },
];

export const usersRoutes: SecuritySubPluginRoutes = [
  {
    path: USERS_PATH,
    component: UsersRoutes,
  },
];

export const hostsRoutes: SecuritySubPluginRoutes = [
  {
    path: HOSTS_PATH,
    component: HostsRoutes,
  },
];

export const routes = [...networkRoutes, ...usersRoutes, ...hostsRoutes];
