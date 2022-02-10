/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import { AppMountParameters } from '../../../../../../src/core/public';
import { UXMetrics } from './core_web_vitals';

export interface HeaderMenuPortalProps {
  children: ReactNode;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
}

export interface CoreVitalProps {
  loading: boolean;
  data?: UXMetrics | null;
  displayServiceName?: boolean;
  serviceName?: string;
  totalPageViews?: number;
  displayTrafficMetric?: boolean;
}
