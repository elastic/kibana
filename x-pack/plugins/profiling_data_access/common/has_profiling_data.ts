/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PartialSetupState, ProfilingSetupOptions } from './setup';

export async function hasProfilingData({
  clientWithProfilingAuth,
}: ProfilingSetupOptions): Promise<PartialSetupState> {
  const hasProfilingDataResponse = await clientWithProfilingAuth.search('has_any_profiling_data', {
    index: 'profiling*',
    size: 0,
    track_total_hits: 1,
    terminate_after: 1,
  });
  return { data: { available: hasProfilingDataResponse.hits.total.value > 0 } };
}
