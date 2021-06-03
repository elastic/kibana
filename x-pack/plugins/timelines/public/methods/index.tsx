/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Store } from 'redux';
import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import type { TGridProps } from '../types';
import { LastUpdatedAtProps, LoadingPanelProps } from '../components';

export const getTGridLazy = (
  props: TGridProps,
  { store, storage }: { store?: Store; storage: Storage }
) => {
  const TimelineLazy = lazy(() => import('../components'));
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <TimelineLazy {...props} store={store} storage={storage} />
    </Suspense>
  );
};

export const getLastUpdatedLazy = (props: LastUpdatedAtProps) => {
  const LastUpdatedLazy = lazy(() => import('../components/last_updated'));
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <LastUpdatedLazy {...props} />
    </Suspense>
  );
};

export const getLoadingPanelLazy = (props: LoadingPanelProps) => {
  const LoadingPanelLazy = lazy(() => import('../components/loading'));
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <LoadingPanelLazy {...props} />
    </Suspense>
  );
};
