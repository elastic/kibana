/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { Measurement } from './types';

export function mergeByLabels(measurements: Measurement[]) {
  return measurements.reduce((prev, entry) => {
    const entryForLabels = prev.find((item) =>
      isEqual(item.labels, entry.labels)
    );

    if (!entryForLabels) {
      prev.push(entry);
    } else {
      Object.assign(entryForLabels.metrics, entry.metrics);
    }

    return prev;
  }, [] as Measurement[]);
}
