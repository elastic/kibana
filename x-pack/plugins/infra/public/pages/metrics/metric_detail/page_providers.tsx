/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { Source } from '../../../containers/source';
import { MetricsTimeProvider } from './hooks/use_metrics_time';

export const withMetricPageProviders = <T extends object>(Component: React.ComponentType<T>) => (
  props: T
) => (
  <Source.Provider sourceId="default">
    <MetricsTimeProvider>
      <Component {...props} />
    </MetricsTimeProvider>
  </Source.Provider>
);
