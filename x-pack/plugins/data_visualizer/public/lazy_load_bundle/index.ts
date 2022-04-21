/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import type { FileDataVisualizerSpec, IndexDataVisualizerSpec } from '../application';
import { getCoreStart } from '../kibana_services';

let loadModulesPromise: Promise<LazyLoadedModules>;

interface LazyLoadedModules {
  FileDataVisualizer: FileDataVisualizerSpec;
  IndexDataVisualizer: IndexDataVisualizerSpec;
  getHttp: () => HttpSetup;
}

export async function lazyLoadModules(): Promise<LazyLoadedModules> {
  if (typeof loadModulesPromise !== 'undefined') {
    return loadModulesPromise;
  }

  loadModulesPromise = new Promise(async (resolve, reject) => {
    try {
      const lazyImports = await import('./lazy');
      resolve({ ...lazyImports, getHttp: () => getCoreStart().http });
    } catch (error) {
      reject(error);
    }
  });
  return loadModulesPromise;
}
