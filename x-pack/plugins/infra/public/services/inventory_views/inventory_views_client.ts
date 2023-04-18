/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  CreateInventoryViewAttributesRequestPayload,
  createInventoryViewRequestPayloadRT,
  findInventoryViewResponsePayloadRT,
  getInventoryViewUrl,
  inventoryViewResponsePayloadRT,
  UpdateInventoryViewAttributesRequestPayload,
} from '../../../common/http_api/latest';
import {
  DeleteInventoryViewError,
  FetchInventoryViewError,
  InventoryView,
  UpsertInventoryViewError,
} from '../../../common/inventory_views';
import { decodeOrThrow } from '../../../common/runtime_types';
import { IInventoryViewsClient } from './types';

export class InventoryViewsClient implements IInventoryViewsClient {
  constructor(private readonly http: HttpStart) {}

  async findInventoryViews(): Promise<InventoryView[]> {
    const response = await this.http.get(getInventoryViewUrl()).catch((error) => {
      throw new FetchInventoryViewError(`Failed to fetch inventory views: ${error}`);
    });

    const { data } = decodeOrThrow(
      findInventoryViewResponsePayloadRT,
      (message: string) =>
        new FetchInventoryViewError(`Failed to decode inventory views: ${message}"`)
    )(response);

    return data;
  }

  async getInventoryView(inventoryViewId: string): Promise<InventoryView> {
    const response = await this.http.get(getInventoryViewUrl(inventoryViewId)).catch((error) => {
      throw new FetchInventoryViewError(
        `Failed to fetch inventory view "${inventoryViewId}": ${error}`
      );
    });

    const { data } = decodeOrThrow(
      inventoryViewResponsePayloadRT,
      (message: string) =>
        new FetchInventoryViewError(
          `Failed to decode inventory view "${inventoryViewId}": ${message}"`
        )
    )(response);

    return data;
  }

  async createInventoryView(
    inventoryViewAttributes: CreateInventoryViewAttributesRequestPayload
  ): Promise<InventoryView> {
    const response = await this.http
      .post(getInventoryViewUrl(), {
        body: JSON.stringify(
          createInventoryViewRequestPayloadRT.encode({ attributes: inventoryViewAttributes })
        ),
      })
      .catch((error) => {
        throw new UpsertInventoryViewError(`Failed to create new inventory view : ${error}`);
      });

    const { data } = decodeOrThrow(
      inventoryViewResponsePayloadRT,
      (message: string) =>
        new UpsertInventoryViewError(`Failed to decode newly written inventory view: ${message}"`)
    )(response);

    return data;
  }

  async updateInventoryView(
    inventoryViewId: string,
    inventoryViewAttributes: UpdateInventoryViewAttributesRequestPayload
  ): Promise<InventoryView> {
    const response = await this.http
      .put(getInventoryViewUrl(inventoryViewId), {
        body: JSON.stringify(
          createInventoryViewRequestPayloadRT.encode({ attributes: inventoryViewAttributes })
        ),
      })
      .catch((error) => {
        throw new UpsertInventoryViewError(
          `Failed to update inventory view "${inventoryViewId}": ${error}`
        );
      });

    const { data } = decodeOrThrow(
      inventoryViewResponsePayloadRT,
      (message: string) =>
        new UpsertInventoryViewError(
          `Failed to decode updated inventory view "${inventoryViewId}": ${message}"`
        )
    )(response);

    return data;
  }

  deleteInventoryView(inventoryViewId: string): Promise<null> {
    return this.http
      .delete(getInventoryViewUrl(inventoryViewId))
      .then(() => null)
      .catch((error) => {
        throw new DeleteInventoryViewError(
          `Failed to delete inventory view "${inventoryViewId}": ${error}`
        );
      });
  }
}
