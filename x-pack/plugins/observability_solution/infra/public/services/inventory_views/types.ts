/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  CreateInventoryViewAttributesRequestPayload,
  CreateInventoryViewResponsePayload,
  FindInventoryViewResponsePayload,
  GetInventoryViewResposePayload,
  UpdateInventoryViewAttributesRequestPayload,
  UpdateInventoryViewResponsePayload,
} from '../../../common/http_api/latest';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InventoryViewsServiceSetup {}

export interface InventoryViewsServiceStart {
  getClient: () => Promise<IInventoryViewsClient>;
}

export interface InventoryViewsServiceStartDeps {
  http: HttpStart;
}

export interface IInventoryViewsClient {
  findInventoryViews(): Promise<FindInventoryViewResponsePayload['data']>;
  getInventoryView(inventoryViewId: string): Promise<GetInventoryViewResposePayload>;
  createInventoryView(
    inventoryViewAttributes: CreateInventoryViewAttributesRequestPayload
  ): Promise<CreateInventoryViewResponsePayload>;
  updateInventoryView(
    inventoryViewId: string,
    inventoryViewAttributes: UpdateInventoryViewAttributesRequestPayload
  ): Promise<UpdateInventoryViewResponsePayload>;
  deleteInventoryView(inventoryViewId: string): Promise<null>;
}
