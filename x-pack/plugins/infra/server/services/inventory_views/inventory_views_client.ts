/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import Boom from '@hapi/boom';
import {
  staticInventoryViewAttributes,
  staticInventoryViewId,
} from '../../../common/inventory_views';
import type {
  CreateInventoryViewAttributesRequestPayload,
  InventoryViewRequestQuery,
} from '../../../common/http_api/latest';
import type { InventoryView, InventoryViewAttributes } from '../../../common/inventory_views';
import { decodeOrThrow } from '../../../common/runtime_types';
import type { IInfraSources } from '../../lib/sources';
import { inventoryViewSavedObjectName } from '../../saved_objects/inventory_view';
import { inventoryViewSavedObjectRT } from '../../saved_objects/inventory_view/types';
import type { IInventoryViewsClient } from './types';

export class InventoryViewsClient implements IInventoryViewsClient {
  constructor(
    private readonly logger: Logger,
    private readonly savedObjectsClient: SavedObjectsClientContract,
    private readonly infraSources: IInfraSources
  ) {}

  static STATIC_VIEW_ID = '0';
  static DEFAULT_SOURCE_ID = 'default';

  public async find(query: InventoryViewRequestQuery): Promise<InventoryView[]> {
    this.logger.debug('Trying to load inventory views ...');

    const sourceId = query.sourceId ?? InventoryViewsClient.DEFAULT_SOURCE_ID;

    const [sourceConfiguration, inventoryViewSavedObject] = await Promise.all([
      this.infraSources.getSourceConfiguration(this.savedObjectsClient, sourceId),
      this.getAllViews(),
    ]);

    const defaultView = InventoryViewsClient.createStaticView(
      sourceConfiguration.configuration.inventoryDefaultView
    );
    const views = inventoryViewSavedObject.saved_objects.map((savedObject) =>
      this.mapSavedObjectToInventoryView(
        savedObject,
        sourceConfiguration.configuration.inventoryDefaultView
      )
    );

    const inventoryViews = [defaultView, ...views];

    const sortedInventoryViews = this.moveDefaultViewOnTop(inventoryViews);

    return sortedInventoryViews;
  }

  public async get(
    inventoryViewId: string,
    query: InventoryViewRequestQuery
  ): Promise<InventoryView> {
    this.logger.debug(`Trying to load inventory view with id ${inventoryViewId} ...`);

    const sourceId = query.sourceId ?? InventoryViewsClient.DEFAULT_SOURCE_ID;

    // Handle the case where the requested resource is the static inventory view
    if (inventoryViewId === InventoryViewsClient.STATIC_VIEW_ID) {
      const sourceConfiguration = await this.infraSources.getSourceConfiguration(
        this.savedObjectsClient,
        sourceId
      );

      return InventoryViewsClient.createStaticView(
        sourceConfiguration.configuration.inventoryDefaultView
      );
    }

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
    this.logger.debug(`Trying to update inventory view with id "${inventoryViewId}"...`);

    // Validate there is not a view with the same name
    await this.assertNameConflict(attributes.name, [inventoryViewId]);

    const sourceId = query.sourceId ?? InventoryViewsClient.DEFAULT_SOURCE_ID;

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
        isStatic: false,
      },
    };
  }

  private getAllViews() {
    return this.savedObjectsClient.find<InventoryViewAttributes>({
      type: inventoryViewSavedObjectName,
      perPage: 1000, // Fetch 1 page by default with a max of 1000 results
    });
  }

  private moveDefaultViewOnTop(views: InventoryView[]) {
    const defaultViewPosition = views.findIndex((view) => view.attributes.isDefault);

    if (defaultViewPosition !== -1) {
      const element = views.splice(defaultViewPosition, 1)[0];
      views.unshift(element);
    }

    return views;
  }

  /**
   * We want to control conflicting names on the views
   */
  private async assertNameConflict(name: string, whitelist: string[] = []) {
    const results = await this.getAllViews();

    const hasConflict = [InventoryViewsClient.createStaticView(), ...results.saved_objects].some(
      (obj) => !whitelist.includes(obj.id) && obj.attributes.name === name
    );

    if (hasConflict) {
      throw Boom.conflict('A view with that name already exists.');
    }
  }

  private static createStaticView = (defaultViewId?: string): InventoryView => ({
    id: staticInventoryViewId,
    attributes: {
      ...staticInventoryViewAttributes,
      isDefault: defaultViewId === InventoryViewsClient.STATIC_VIEW_ID,
    },
  });
}
