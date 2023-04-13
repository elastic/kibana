/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStart as DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import {
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import Boom from '@hapi/boom';
import {
  CreateInventoryViewAttributesRequestPayload,
  InventoryViewRequestQuery,
} from '../../../common/http_api/latest';
import { InventoryView, InventoryViewAttributes } from '../../../common/inventory_views';
import { decodeOrThrow } from '../../../common/runtime_types';
import type { IInfraSources } from '../../lib/sources';
import { inventoryViewSavedObjectName } from '../../saved_objects/inventory_view';
import { inventoryViewSavedObjectRT } from '../../saved_objects/inventory_view/types';
import { IInventoryViewsClient } from './types';

export class InventoryViewsClient implements IInventoryViewsClient {
  constructor(
    private readonly logger: Logger,
    private readonly savedObjectsClient: SavedObjectsClientContract,
    private readonly infraSources: IInfraSources
  ) {}

  public async find(query: InventoryViewRequestQuery): Promise<InventoryView[]> {
    this.logger.debug('Trying to load inventory views ...');

    const sourceId = query.sourceId ?? 'default';

    const [sourceConfiguration, inventoryViewSavedObject] = await Promise.all([
      this.infraSources.getSourceConfiguration(this.savedObjectsClient, sourceId),
      this.savedObjectsClient.find({
        type: inventoryViewSavedObjectName,
        perPage: 1000, // Fetch 1 page by default with a max of 1000 results
      }),
    ]);

    return inventoryViewSavedObject.saved_objects.map((savedObject) =>
      this.mapSavedObjectToInventoryView(
        savedObject,
        sourceConfiguration.configuration.inventoryDefaultView
      )
    );
  }

  public async get(
    inventoryViewId: string,
    query: InventoryViewRequestQuery
  ): Promise<InventoryView> {
    this.logger.debug(`Trying to load inventory view with id ${inventoryViewId} ...`);

    const sourceId = query.sourceId ?? 'default';

    const [sourceConfiguration, inventoryViewSavedObject] = await Promise.all([
      this.infraSources.getSourceConfiguration(this.savedObjectsClient, sourceId),
      this.savedObjectsClient.get(inventoryViewSavedObjectName, inventoryViewId),
    ]);

    return this.mapSavedObjectToInventoryView(
      inventoryViewSavedObject,
      sourceConfiguration.configuration.inventoryDefaultView
    );
  }

  public async create(
    attributes: CreateInventoryViewAttributesRequestPayload
  ): Promise<InventoryView> {
    this.logger.debug(`Trying to create inventory view ...`);

    // Validate there is not a view with the same name
    await this.assertNameConflict(attributes.name);

    const inventoryViewSavedObject = await this.savedObjectsClient.create(
      inventoryViewSavedObjectName,
      attributes
    );

    return this.mapSavedObjectToInventoryView(inventoryViewSavedObject);
  }

  public async update(
    inventoryViewId: string,
    attributes: CreateInventoryViewAttributesRequestPayload,
    query: InventoryViewRequestQuery
  ): Promise<InventoryView> {
    this.logger.debug(`Trying to create inventory view ...`);

    // Validate there is not a view with the same name
    await this.assertNameConflict(attributes.name, [inventoryViewId]);

    const sourceId = query.sourceId ?? 'default';

    const [sourceConfiguration, inventoryViewSavedObject] = await Promise.all([
      this.infraSources.getSourceConfiguration(this.savedObjectsClient, sourceId),
      this.savedObjectsClient.update(inventoryViewSavedObjectName, inventoryViewId, attributes),
    ]);

    return this.mapSavedObjectToInventoryView(
      inventoryViewSavedObject,
      sourceConfiguration.configuration.inventoryDefaultView
    );
  }

  public delete(inventoryViewId: string): Promise<{}> {
    this.logger.debug(`Trying to delete inventory view with id ${inventoryViewId} ...`);

    return this.savedObjectsClient.delete(inventoryViewSavedObjectName, inventoryViewId);
  }

  private mapSavedObjectToInventoryView(
    savedObject: SavedObject | SavedObjectsUpdateResponse,
    defaultViewId?: string
  ) {
    const inventoryViewSavedObject = decodeOrThrow(inventoryViewSavedObjectRT)(savedObject);

    return {
      id: inventoryViewSavedObject.id,
      version: inventoryViewSavedObject.version,
      updatedAt: inventoryViewSavedObject.updated_at,
      attributes: {
        ...inventoryViewSavedObject.attributes,
        isDefault: inventoryViewSavedObject.id === defaultViewId,
      },
    };
  }

  /**
   * We want to control conflicting names on the views
   */
  private async assertNameConflict(name: string, whitelist: string[] = []) {
    const results = await this.savedObjectsClient.find<InventoryViewAttributes>({
      type: inventoryViewSavedObjectName,
      perPage: 1000,
    });

    const hasConflict = results.saved_objects.some(
      (obj) => !whitelist.includes(obj.id) && obj.attributes.name === name
    );

    if (hasConflict) {
      throw Boom.conflict('A view with that name already exists.');
    }
  }
}
