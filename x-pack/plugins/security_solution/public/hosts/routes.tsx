/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { SecuritySubPluginRoutes } from '../app/types';
import { SecurityPageName } from '../app/types';
import { HOSTS_PATH } from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

const HostsContainerLazy: React.FC = lazy(() => import('./pages'));

export const HostsRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.hosts}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <HostsContainerLazy />
      </Suspense>
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: HOSTS_PATH,
    component: HostsRoutes,
  },
];
