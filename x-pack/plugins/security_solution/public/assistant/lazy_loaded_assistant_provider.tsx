/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Suspense, useEffect, useState } from 'react';

import { EuiErrorBoundary, EuiSkeletonText } from '@elastic/eui';
import type { SecurityAppStore } from '../common/store/types';
import { ElasticAssistantProvider } from './assistant_provider';

const AssistantProviderAppStateLazy = React.lazy(() => import('./assistant_provider'));

const LazyWrapper: FC = ({ children }) => (
  <EuiErrorBoundary>
    <Suspense fallback={<EuiSkeletonText lines={3} />}>{children}</Suspense>
  </EuiErrorBoundary>
);

/**
 * Lazy-wrapped AssistantProvider React component
 */
// Write a higher order component that wraps the AssistantProviderAppStateLazy component with a store arg
export const LazyAssistantProvider = (props) => (
  <LazyWrapper>
    <AssistantProviderAppStateLazy {...props} />
  </LazyWrapper>
);

const withStore = (WrappedComponent, store) => {
  const WithStore = (props) => {
    return <WrappedComponent {...props} store={store} />;
  };

  WithStore.displayName = `WithStore(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithStore;
};

// Write higher order function component to wrap component with extra param store
export const getAssistantProvider = async (getStore: Promise<SecurityAppStore>) => {
  const store = await getStore;
  console.log(
    `--@@getAssistantProvider ElasticAssistantProvider`,
    withStore(ElasticAssistantProvider, store)
  );
  console.log(`--@@getAssistantProvider React.Fragment`, React.Fragment);

  return store ? React.Fragment : React.Fragment;
};
