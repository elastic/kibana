/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InventoryViewsClient } from './inventory_views_client';
import {
  InventoryViewsServiceStartDeps,
  InventoryViewsServiceSetup,
  InventoryViewsServiceStart,
} from './types';

export class InventoryViewsService {
  public setup(): InventoryViewsServiceSetup {}

  public start({ http }: InventoryViewsServiceStartDeps): InventoryViewsServiceStart {
    const client = new InventoryViewsClient(http);

    return {
      client,
    };
  }
}
