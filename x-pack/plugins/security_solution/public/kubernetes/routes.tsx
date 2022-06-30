/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { KubernetesContainer } from './pages';

import { SecurityPageName, SecuritySubPluginRoutes } from '../app/types';
import { KUBERNETES_PATH } from '../../common/constants';

export const KubernetesRoutes = () => (
  <TrackApplicationView viewId={SecurityPageName.kubernetes}>
    <KubernetesContainer />
  </TrackApplicationView>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: KUBERNETES_PATH,
    render: KubernetesRoutes,
  },
];
