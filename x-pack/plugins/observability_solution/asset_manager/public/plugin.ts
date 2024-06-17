/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { Logger } from '@kbn/logging';

import { AssetManagerPluginClass } from './types';
import { PublicAssetsClient } from './lib/public_assets_client';
import type { AssetManagerPublicConfig } from '../common/config';

export class Plugin implements AssetManagerPluginClass {
  public config: AssetManagerPublicConfig;
  public logger: Logger;

  constructor(context: PluginInitializerContext<{}>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  setup(core: CoreSetup) {
    // Check for config value and bail out if not "alpha-enabled"
    if (!this.config.alphaEnabled) {
      this.logger.debug('Public is NOT enabled');
      return;
    }

    this.logger.debug('Public is enabled');

    const publicAssetsClient = new PublicAssetsClient(core.http);
    return {
      publicAssetsClient,
    };
  }

  start(core: CoreStart) {
    // Check for config value and bail out if not "alpha-enabled"
    if (!this.config.alphaEnabled) {
      return;
    }

    const publicAssetsClient = new PublicAssetsClient(core.http);
    return {
      publicAssetsClient,
    };
  }

  stop() {}
}
