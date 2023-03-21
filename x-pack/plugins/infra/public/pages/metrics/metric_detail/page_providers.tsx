/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { SourceProvider } from '../../../containers/metrics_source';
import { MetricsTimeProvider } from './hooks/use_metrics_time';

export const withMetricPageProviders =
  <T extends object>(Component: React.ComponentType<T>) =>
  (props: T) =>
    (
      <EuiErrorBoundary>
        <SourceProvider sourceId="default">
          <MetricsTimeProvider>
            <Component {...props} />
          </MetricsTimeProvider>
        </SourceProvider>
      </EuiErrorBoundary>
    );
