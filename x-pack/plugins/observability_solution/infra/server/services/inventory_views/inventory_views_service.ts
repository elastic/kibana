/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { InventoryViewsClient } from './inventory_views_client';
import type {
  InventoryViewsServiceSetup,
  InventoryViewsServiceStart,
  InventoryViewsServiceStartDeps,
} from './types';

export class InventoryViewsService {
  constructor(private readonly logger: Logger) {}

  public setup(): InventoryViewsServiceSetup {}

  public start({
    infraSources,
    savedObjects,
  }: InventoryViewsServiceStartDeps): InventoryViewsServiceStart {
    const { logger } = this;

    return {
      getClient(savedObjectsClient: SavedObjectsClientContract) {
        return new InventoryViewsClient(logger, savedObjectsClient, infraSources);
      },

      getScopedClient(request: KibanaRequest) {
        const savedObjectsClient = savedObjects.getScopedClient(request);

        return this.getClient(savedObjectsClient);
      },
    };
  }
}
