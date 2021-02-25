/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import type { FC, PropsWithChildren, PropsWithRef, ReactElement } from 'react';
import React, { lazy, Suspense, useMemo } from 'react';

interface InternalProps<T> {
  fn: () => Promise<FC<T>>;
  props: JSX.IntrinsicAttributes & PropsWithRef<PropsWithChildren<T>>;
}

export const LazyWrapper: <T>(props: InternalProps<T>) => ReactElement = ({ fn, props }) => {
  const LazyComponent = useMemo(() => lazy(() => fn().then((x) => ({ default: x }))), [fn]);
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};
