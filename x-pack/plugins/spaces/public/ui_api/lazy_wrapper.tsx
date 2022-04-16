/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren, PropsWithRef, ReactElement } from 'react';
import React, { lazy, useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';

import type { StartServicesAccessor } from '@kbn/core/public';

import type { PluginsStart } from '../plugin';
import { SuspenseErrorBoundary } from '../suspense_error_boundary';

interface InternalProps<T> {
  fn: () => Promise<FC<T>>;
  getStartServices: StartServicesAccessor<PluginsStart>;
  showLoadingSpinner?: boolean;
  props: JSX.IntrinsicAttributes & PropsWithRef<PropsWithChildren<T>>;
}

export const LazyWrapper: <T>(props: InternalProps<T>) => ReactElement | null = ({
  fn,
  getStartServices,
  showLoadingSpinner,
  props,
}) => {
  const { value: startServices = [{ notifications: undefined }] } = useAsync(getStartServices);
  const [{ notifications }] = startServices;

  const LazyComponent = useMemo(() => lazy(() => fn().then((x) => ({ default: x }))), [fn]);

  if (!notifications) {
    return null;
  }

  return (
    <SuspenseErrorBoundary notifications={notifications} showLoadingSpinner={showLoadingSpinner}>
      <LazyComponent {...props} />
    </SuspenseErrorBoundary>
  );
};
