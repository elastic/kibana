/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Suspense } from 'react';
import { EuiLoadingSpinnerSize } from '@elastic/eui/src/components/loading/loading_spinner';
import { CenterJustifiedSpinner } from '../components/center_justified_spinner';

export function suspendedComponentWithProps<T = unknown>(
  ComponentToSuspend: React.ComponentType<T>,
  size?: EuiLoadingSpinnerSize
) {
  return (props: T) => (
    <Suspense fallback={<CenterJustifiedSpinner size={size ?? 'm'} />}>
      <ComponentToSuspend {...props} />
    </Suspense>
  );
}
