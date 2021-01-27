/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SetupTimeRange } from './setup_request';

export function calculateThroughput({
  start,
  end,
  value,
}: SetupTimeRange & { value: number }) {
  const durationAsMinutes = (end - start) / 1000 / 60;
  return value / durationAsMinutes;
}
