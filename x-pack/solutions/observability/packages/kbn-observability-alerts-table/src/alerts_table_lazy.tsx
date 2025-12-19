/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { ObservabilityAlertsTableType } from './alerts_table';

const AlertsTable = lazy(() => import('./alerts_table')) as ObservabilityAlertsTableType;

export function ObservabilityAlertsTableLazy(
  props: ComponentProps<ObservabilityAlertsTableType> & { hideLazyLoader?: boolean }
) {
  const { hideLazyLoader, ...tableProps } = props;
  return (
    <Suspense fallback={hideLazyLoader ? null : <EuiLoadingSpinner />}>
      <AlertsTable {...tableProps} />
    </Suspense>
  );
}
