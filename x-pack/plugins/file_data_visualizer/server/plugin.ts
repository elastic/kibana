/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/server';
import { fileDataVisualizerRoutes } from './routes';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { StartDeps } from './types';

interface SetupDeps {
  usageCollection: UsageCollectionSetup;
}

export class FileDataVisualizerPlugin implements Plugin {
  async setup(coreSetup: CoreSetup<StartDeps, unknown>, plugins: SetupDeps) {
    fileDataVisualizerRoutes(coreSetup);
  }

  start(core: CoreStart) {}
}
