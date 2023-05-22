/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { ObservabilityAlertSearchBarProps } from './types';

const ObservabilityAlertSearchBarLazy = lazy(() => import('./alert_search_bar'));

export function ObservabilityAlertSearchBar(props: ObservabilityAlertSearchBarProps) {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <ObservabilityAlertSearchBarLazy {...props} />
    </Suspense>
  );
}
