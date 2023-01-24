/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SnapshotMetricType } from '../../../../../common/inventory_models/types';

// Some metrics in the UI are in a different unit that what we store in ES.
export const convertMetricValue = (metric: SnapshotMetricType, value: number) => {
  if (converters[metric]) {
    return converters[metric](value);
  } else {
    return value;
  }
};
const converters: Record<string, (n: number) => number> = {
  cpu: (n) => Number(n) / 100,
  memory: (n) => Number(n) / 100,
};
