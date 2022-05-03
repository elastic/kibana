/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazyLoadModules } from '../lazy_load_bundle';

import type { ExplainLogRateSpikesSpec } from '../components/explain_log_rate_spikes';

export async function getExplainLogRateSpikesComponent(): Promise<() => ExplainLogRateSpikesSpec> {
  const modules = await lazyLoadModules();
  return () => modules.ExplainLogRateSpikes;
}
