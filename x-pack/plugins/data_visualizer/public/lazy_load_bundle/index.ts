/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '../../../../../src/core/public/http/types';
import type { FileDataVisualizerSpec } from '../application/file_data_visualizer/file_data_visualizer';
import type { IndexDataVisualizerSpec } from '../application/index_data_visualizer/index_data_visualizer';
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

  loadModulesPromise = new Promise(async (resolve) => {
    const lazyImports = await import('./lazy');

    resolve({
      ...lazyImports,
      getHttp: () => getCoreStart().http,
    });
  });
  return loadModulesPromise;
}
