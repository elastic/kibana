/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsUpdateResponse,
  SavedObjectsUtils,
} from '@kbn/core/server';
import Boom from '@hapi/boom';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import {
  inventoryViewAttributesRT,
  staticInventoryViewAttributes,
  staticInventoryViewId,
} from '../../../common/inventory_views';
import type {
  CreateInventoryViewAttributesRequestPayload,
  InventoryViewRequestQuery,
} from '../../../common/http_api/latest';
import type { InventoryView, InventoryViewAttributes } from '../../../common/inventory_views';
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

  public async update(
    inventoryViewId: string | null,
    attributes: CreateInventoryViewAttributesRequestPayload,
    query: InventoryViewRequestQuery
  ): Promise<InventoryView> {
    this.logger.debug(`Trying to update inventory view with id "${inventoryViewId}"...`);

    const viewId = inventoryViewId ?? SavedObjectsUtils.generateId();

    // Validate there is not a view with the same name
    await this.assertNameConflict(attributes.name, [viewId]);

    const sourceId = query.sourceId ?? InventoryViewsClient.DEFAULT_SOURCE_ID;

    const [sourceConfiguration, inventoryViewSavedObject] = await Promise.all([
      this.infraSources.getSourceConfiguration(this.savedObjectsClient, sourceId),
      this.savedObjectsClient.create(inventoryViewSavedObjectName, attributes, {
        id: viewId,
        overwrite: true,
      }),
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

  private mapSavedObjectToInventoryView<T>(
    savedObject: SavedObject<T> | SavedObjectsUpdateResponse<T>,
    defaultViewId?: string
  ): InventoryView {
    const inventoryViewSavedObject = decodeOrThrow(inventoryViewSavedObjectRT)(savedObject);

    return {
      id: inventoryViewSavedObject.id,
      version: inventoryViewSavedObject.version,
      updatedAt: inventoryViewSavedObject.updated_at,
      attributes: {
        ...decodeOrThrow(inventoryViewAttributesRT)(inventoryViewSavedObject.attributes),
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
