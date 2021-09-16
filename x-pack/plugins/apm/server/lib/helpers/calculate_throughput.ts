/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SetupTimeRange } from './setup_request';

export type ThroughputUnit = 'minute' | 'second';
export function calculateThroughput({
  start,
  end,
  value,
  unit = 'minute',
}: SetupTimeRange & { value: number; unit?: ThroughputUnit }) {
  const durationAsSeconds = (end - start) / 1000;
  const duration =
    unit === 'minute' ? durationAsSeconds / 60 : durationAsSeconds;
  return value / duration;
}

export function getThroughputUnit(bucketSize: number): ThroughputUnit {
  return bucketSize >= 60 ? 'minute' : 'second';
}
