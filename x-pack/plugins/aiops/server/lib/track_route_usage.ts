/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

export function trackAIOpsRouteUsage(
  analysisType: string,
  source?: string | string[],
  usageCounter?: UsageCounter
) {
  if (usageCounter && typeof source === 'string') {
    usageCounter.incrementCounter({
      counterName: analysisType,
      counterType: `run_via_${source}`,
      incrementBy: 1,
    });
  }
}
