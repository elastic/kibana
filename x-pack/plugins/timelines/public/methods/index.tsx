/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { Store } from 'redux';
import type { Storage } from '../../../../../src/plugins/kibana_utils/public';
import type { DataPublicPluginStart } from '../../../../../src/plugins/data/public';
import type { TGridProps } from '../types';
import type {
  LastUpdatedAtProps,
  LoadingPanelProps,
  FieldBrowserWrappedProps,
} from '../components';
import type { AddToCaseActionProps } from '../components/actions/timeline/cases/add_to_case_action';

const TimelineLazy = lazy(() => import('../components'));
export const getTGridLazy = (
  props: TGridProps,
  {
    store,
    storage,
    data,
    setStore,
  }: {
    store?: Store;
    storage: Storage;
    data: DataPublicPluginStart;
    setStore: (store: Store) => void;
  }
) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <TimelineLazy {...props} store={store} storage={storage} data={data} setStore={setStore} />
    </Suspense>
  );
};

const LastUpdatedLazy = lazy(() => import('../components/last_updated'));
export const getLastUpdatedLazy = (props: LastUpdatedAtProps) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <LastUpdatedLazy {...props} />
    </Suspense>
  );
};

const LoadingPanelLazy = lazy(() => import('../components/loading'));
export const getLoadingPanelLazy = (props: LoadingPanelProps) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <LoadingPanelLazy {...props} />
    </Suspense>
  );
};

const FieldsBrowserLazy = lazy(() => import('../components/fields_browser'));
export const getFieldsBrowserLazy = (
  props: FieldBrowserWrappedProps,
  { store }: { store: Store }
) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <FieldsBrowserLazy {...props} store={store} />
    </Suspense>
  );
};

const AddToCaseLazy = lazy(() => import('../components/actions/timeline/cases/add_to_case_action'));
export const getAddToCaseLazy = (props: AddToCaseActionProps) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <AddToCaseLazy {...props} />
    </Suspense>
  );
};
