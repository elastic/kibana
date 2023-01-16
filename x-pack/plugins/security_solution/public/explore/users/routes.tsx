/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { UsersContainer } from './pages';

import type { SecuritySubPluginRoutes } from '../../app/types';
import { SecurityPageName } from '../../app/types';
import { USERS_PATH } from '../../../common/constants';
import { PluginTemplateWrapper } from '../../common/components/plugin_template_wrapper';

export const UsersRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.users}>
      <UsersContainer />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: USERS_PATH,
    component: UsersRoutes,
  },
];
