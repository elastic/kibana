/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MANAGEMENT_PATH, MANAGE_PATH } from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';

const ManagementLandingLazy = React.lazy(() => import('./route_landing_lazy'));
const ManagementRoutesLazy = React.lazy(() => import('./routes_lazy'));

export const routes: SecuritySubPluginRoutes = [
  {
    path: MANAGE_PATH,
    component: ManagementLandingLazy,
  },
  {
    path: MANAGEMENT_PATH,
    component: ManagementRoutesLazy,
  },
];
