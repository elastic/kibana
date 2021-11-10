/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/server';
import { StartDeps, SetupDeps } from './types';
import { registerWithCustomIntegrations } from './register_custom_integration';

export class DataVisualizerPlugin implements Plugin {
  constructor() {}

  setup(coreSetup: CoreSetup<StartDeps, unknown>, plugins: SetupDeps) {
    // home-plugin required
    if (plugins.home && plugins.customIntegrations) {
      registerWithCustomIntegrations(plugins.customIntegrations);
    }
  }

  start(core: CoreStart) {}
}
