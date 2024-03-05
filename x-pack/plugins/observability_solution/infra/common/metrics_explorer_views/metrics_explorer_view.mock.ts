/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { staticMetricsExplorerViewAttributes } from './defaults';
import type { MetricsExplorerView, MetricsExplorerViewAttributes } from './types';

export const createMetricsExplorerViewMock = (
  id: string,
  attributes: MetricsExplorerViewAttributes,
  updatedAt?: number,
  version?: string
): MetricsExplorerView => ({
  id,
  attributes: {
    ...staticMetricsExplorerViewAttributes,
    ...attributes,
  },
  updatedAt,
  version,
});
