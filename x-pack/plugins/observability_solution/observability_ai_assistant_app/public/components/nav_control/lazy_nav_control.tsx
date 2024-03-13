/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSuspense } from '@kbn/shared-ux-utility';
import { lazy } from 'react';

export const LazyNavControl = withSuspense(
  lazy(() => import('.').then((m) => ({ default: m.NavControl })))
);
