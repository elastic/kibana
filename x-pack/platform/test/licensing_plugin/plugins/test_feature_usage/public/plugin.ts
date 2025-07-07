/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/public';

interface SetupPlugins {
  licensing: LicensingPluginSetup;
}

export class TestFeatureUsagePlugin {
  public setup(core: CoreSetup, plugins: SetupPlugins) {
    plugins.licensing.featureUsage.register('test-client-A', 'gold');
    plugins.licensing.featureUsage.register('test-client-B', 'enterprise');
  }

  public start() {}
  public stop() {}
}
