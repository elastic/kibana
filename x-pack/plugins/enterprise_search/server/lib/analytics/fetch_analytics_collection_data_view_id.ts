/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { DataViewsService } from '@kbn/data-views-plugin/common';

import { AnalyticsCollectionDataViewId } from '../../../common/types/analytics';

import { fetchAnalyticsCollections } from './fetch_analytics_collection';

export const fetchAnalyticsCollectionDataViewId = async (
  elasticsearchClient: IScopedClusterClient,
  dataViewsService: DataViewsService,
  collectionName: string
): Promise<AnalyticsCollectionDataViewId> => {
  const collections = await fetchAnalyticsCollections(elasticsearchClient, collectionName);

  const collectionDataView = await dataViewsService.find(collections[0].events_datastream, 1);

  return { data_view_id: collectionDataView?.[0]?.id || null };
};
