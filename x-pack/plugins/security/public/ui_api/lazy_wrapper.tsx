/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren, PropsWithRef, ReactElement } from 'react';
import React, { lazy, useMemo } from 'react';

import type { CoreStart } from '@kbn/core/public';

import { SuspenseErrorBoundary } from '../suspense_error_boundary';

interface InternalProps<T> {
  fn: () => Promise<FC<T>>;
  core: CoreStart;
  props: JSX.IntrinsicAttributes & PropsWithRef<PropsWithChildren<T>>;
}

export const LazyWrapper: <T>(props: InternalProps<T>) => ReactElement | null = ({
  fn,
  core,
  props,
}) => {
  const { notifications } = core;

  const LazyComponent = useMemo(() => lazy(() => fn().then((x) => ({ default: x }))), [fn]);

  if (!notifications) {
    return null;
  }

  return (
    <SuspenseErrorBoundary notifications={notifications}>
      <LazyComponent {...props} />
    </SuspenseErrorBoundary>
  );
};
