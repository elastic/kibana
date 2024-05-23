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

import { SecurityPageName } from '../app/types';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { ExploreLandingPage } from './landing';

export const ExploreLanding = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.exploreLanding}>
      <ExploreLandingPage />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

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
