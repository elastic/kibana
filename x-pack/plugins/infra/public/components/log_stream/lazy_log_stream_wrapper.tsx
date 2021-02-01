/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import type { LogStreamProps } from './log_stream';

const LazyLogStream = React.lazy(() => import('./log_stream'));

export const LazyLogStreamWrapper: React.FC<LogStreamProps> = (props) => (
  <React.Suspense fallback={<div />}>
    <LazyLogStream {...props} />
  </React.Suspense>
);
