/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExplainLogRateSpikesSpec } from '../components/explain_log_rate_spikes';
import type { SingleEndpointStreamingDemoSpec } from '../components/single_endpoint_streaming_demo';

let loadModulesPromise: Promise<LazyLoadedModules>;

interface LazyLoadedModules {
  ExplainLogRateSpikes: ExplainLogRateSpikesSpec;
  SingleEndpointStreamingDemo: SingleEndpointStreamingDemoSpec;
}

export async function lazyLoadModules(): Promise<LazyLoadedModules> {
  if (typeof loadModulesPromise !== 'undefined') {
    return loadModulesPromise;
  }

  loadModulesPromise = new Promise(async (resolve, reject) => {
    try {
      const lazyImports = await import('./lazy');
      resolve({ ...lazyImports });
    } catch (error) {
      reject(error);
    }
  });
  return loadModulesPromise;
}
