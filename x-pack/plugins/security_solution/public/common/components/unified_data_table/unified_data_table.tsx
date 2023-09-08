/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingSpinner } from '@elastic/eui';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import React from 'react';

export type { UnifiedDataTableProps };

const UnifiedDataTableLazy = React.lazy(() =>
  import('@kbn/unified-data-table').then(({ UnifiedDataTable }) => ({
    default: UnifiedDataTable,
  }))
);

const UnifiedDataTableLazyWithSuspense = (props: UnifiedDataTableProps) => (
  <React.Suspense fallback={<EuiLoadingSpinner size="m" />}>
    <UnifiedDataTableLazy {...props} />
  </React.Suspense>
);

export const UnifiedDataTable = React.memo(UnifiedDataTableLazyWithSuspense);
