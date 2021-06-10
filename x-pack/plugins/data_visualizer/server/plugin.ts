/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/server';
import { StartDeps, SetupDeps } from './types';
import { dataVisualizerRoutes } from './routes';

export class DataVisualizerPlugin implements Plugin {
  constructor() {}

  async setup(coreSetup: CoreSetup<StartDeps, unknown>, plugins: SetupDeps) {
    dataVisualizerRoutes(coreSetup);
  }

  start(core: CoreStart) {}
}
