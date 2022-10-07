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
import { KUBERNETES_PATH } from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
const KubernetesContainerLazy: React.FC = lazy(() => import('./pages'));

export const KubernetesRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.kubernetes}>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <KubernetesContainerLazy />
      </Suspense>
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: KUBERNETES_PATH,
    component: KubernetesRoutes,
  },
];
