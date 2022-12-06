/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';

import type { AlertsTableStateProps } from '../application/sections/alerts_table/alerts_table_state';

const AlertsTableStateLazy: React.FC<AlertsTableStateProps> = lazy(
  () => import('../application/sections/alerts_table/alerts_table_state')
);

export const getAlertsTableStateLazy = (props: AlertsTableStateProps) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <AlertsTableStateLazy {...props} />
  </Suspense>
);
