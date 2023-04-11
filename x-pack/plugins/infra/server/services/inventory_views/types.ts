/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  ElasticsearchServiceStart,
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import { PluginStart as DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import {
  InventoryView,
  InventoryViewAttributes,
  InventoryViewReference,
  InventoryViewsStaticConfig,
  ResolvedInventoryView,
} from '../../../common/log_views';
import { InfraSources } from '../../lib/sources';

export interface InventoryViewsServiceStartDeps {
  config: InventoryViewsStaticConfig;
  dataViews: DataViewsServerPluginStart;
  elasticsearch: ElasticsearchServiceStart;
  infraSources: InfraSources;
  savedObjects: SavedObjectsServiceStart;
}

export type InventoryViewsServiceSetup = void;

export interface InventoryViewsServiceStart {
  getClient(
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient,
    request?: KibanaRequest
  ): IInventoryViewsClient;
  getScopedClient(request: KibanaRequest): IInventoryViewsClient;
}

export interface IInventoryViewsClient {
  findInventoryView(inventoryViewId: string): Promise<InventoryView>;
  getInventoryView(inventoryViewId: string): Promise<InventoryView>;
  putInventoryView(
    inventoryViewId: string,
    inventoryViewAttributes: Partial<InventoryViewAttributes>
  ): Promise<InventoryView>;
  deleteInventoryView(inventoryViewId: string): Promise<InventoryView>;
}
