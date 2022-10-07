/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import { MANAGEMENT_PATH } from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';
import { CurrentLicense } from '../common/components/current_license';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

const ManagementContainerLazy: React.FC = lazy(() => import('./pages'));

/**
 * Returns the React Router Routes for the management area
 */
const ManagementRoutes = () => (
  <PluginTemplateWrapper>
    <CurrentLicense>
      <Suspense fallback={<EuiLoadingSpinner />}>
        <ManagementContainerLazy />
      </Suspense>
    </CurrentLicense>
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: MANAGEMENT_PATH,
    component: ManagementRoutes,
  },
];
