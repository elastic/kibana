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
} from 'kibana/server';

import type { DataViewsService } from '../../../../../src/plugins/data_views/common';
import type { PluginStart as DataViewsPluginStart } from '../../../../../src/plugins/data_views/server';

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
