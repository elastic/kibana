/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { AssetInventoryPluginSetup, AssetInventoryPluginStart } from './types';
import { defineRoutes } from './routes';
import { initializeTransforms } from './create_transforms/create_transforms';

export class AssetInventoryPlugin
  implements Plugin<AssetInventoryPluginSetup, AssetInventoryPluginStart>
{
  private readonly logger: Logger;

  #isInitialized: boolean = false;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('assetInventory: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('assetInventory: Started');

    // TODO Invoke initialize() when it's due
    // this.initialize(core).catch(() => {});

    return {};
  }

  public stop() {}

  /**
   * Initialization is idempotent and required for (re)creating indices and transforms.
   */
  async initialize(core: CoreStart): Promise<void> {
    this.logger.debug('initialize');
    const esClient = core.elasticsearch.client.asInternalUser;
    await initializeTransforms(esClient, this.logger);
    this.#isInitialized = true;
  }
}
