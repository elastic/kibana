/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { DataViewsService } from '@kbn/data-views-plugin/common';

import { ErrorCode } from '../../../common/types/error_codes';

import { fetchAnalyticsCollectionById } from './fetch_analytics_collection';

export const fetchAnalyticsCollectionDataViewId = async (
  elasticsearchClient: IScopedClusterClient,
  dataViewsService: DataViewsService,
  collectionId: string
): Promise<string | null> => {
  const collection = await fetchAnalyticsCollectionById(elasticsearchClient, collectionId);

  if (!collection) {
    throw new Error(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND);
  }

  const collectionDataView = await dataViewsService.find(collection.events_datastream, 1);

  if (!collectionDataView) {
    throw new Error(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND);
  }

  return collectionDataView?.[0].id || null;
};
