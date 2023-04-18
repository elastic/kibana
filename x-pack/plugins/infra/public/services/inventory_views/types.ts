/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import { InventoryView, InventoryViewAttributes } from '../../../common/inventory_views';

export type InventoryViewsServiceSetup = void;

export interface InventoryViewsServiceStart {
  client: IInventoryViewsClient;
}

export interface InventoryViewsServiceStartDeps {
  http: HttpStart;
}

export interface IInventoryViewsClient {
  findInventoryViews(): Promise<InventoryView[]>;
  getInventoryView(inventoryViewId: string): Promise<InventoryView>;
  createInventoryView(
    inventoryViewAttributes: Partial<InventoryViewAttributes>
  ): Promise<InventoryView>;
  updateInventoryView(
    inventoryViewId: string,
    inventoryViewAttributes: Partial<InventoryViewAttributes>
  ): Promise<InventoryView>;
  deleteInventoryView(inventoryViewId: string): Promise<null>;
}
