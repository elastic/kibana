/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import type { AlertsSearchBarProps } from '../application/sections/alerts_search_bar';

const AlertsSearchBarLazy: React.FC<AlertsSearchBarProps> = lazy(
  () => import('../application/sections/alerts_search_bar/alerts_search_bar')
);

export const getAlertsSearchBarLazy = (props: AlertsSearchBarProps) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <AlertsSearchBarLazy {...props} />
  </Suspense>
);
