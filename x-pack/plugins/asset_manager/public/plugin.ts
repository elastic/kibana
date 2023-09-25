/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, PluginInitializerContext } from '@kbn/core/public';
import { AssetManagerPluginClass, AssetManagerSetupDeps } from './types';
import { PublicAssetsClient } from './lib/public_assets_client';

export class Plugin implements AssetManagerPluginClass {
  public config: {};

  constructor(context: PluginInitializerContext<{}>) {
    this.config = context.config.get();
  }

  setup(core: CoreSetup, pluginsSetup: AssetManagerSetupDeps) {
    const publicAssetsClient = new PublicAssetsClient(core.http);
    return {
      publicAssetsClient,
    };
  }

  start() {}
  stop() {}
}
