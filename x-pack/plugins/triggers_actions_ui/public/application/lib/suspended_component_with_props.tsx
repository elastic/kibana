/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

export function suspendedComponentWithProps<T = unknown>(
  ComponentToSuspend: React.ComponentType<T>
) {
  return (props: T) => (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <ComponentToSuspend {...props} />
    </Suspense>
  );
}
