/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IScopedClusterClient,
  SavedObjectsClientContract,
  KibanaRequest,
} from '@kbn/core/server';

import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';

export type GetDataViewsService = () => Promise<DataViewsService>;

export function getDataViewsServiceFactory(
  getDataViews: () => DataViewsPluginStart | null,
  savedObjectClient: SavedObjectsClientContract,
  scopedClient: IScopedClusterClient,
  request: KibanaRequest
): GetDataViewsService {
  const dataViews = getDataViews();
  if (dataViews === null) {
    throw Error('data views service has not been initialized');
  }

  return () =>
    dataViews.dataViewsServiceFactory(savedObjectClient, scopedClient.asCurrentUser, request);
}
