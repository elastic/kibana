/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient } from '@kbn/core/server';
import { DataView, DataViewsService } from '@kbn/data-views-plugin/common';

import { ANALYTICS_COLLECTIONS_INDEX } from '../..';

import { AnalyticsCollectionDocument, AnalyticsCollection } from '../../../common/types/analytics';
import { ErrorCode } from '../../../common/types/error_codes';
import { toAlphanumeric } from '../../../common/utils/to_alphanumeric';

import { fetchAnalyticsCollectionById } from './fetch_analytics_collection';
import { setupAnalyticsCollectionIndex } from './setup_indices';

interface AddAnalyticsCollectionRequestBody {
  name: string;
}

const createAnalyticsCollection = async (
  client: IScopedClusterClient,
  document: AnalyticsCollectionDocument,
  id: string
): Promise<AnalyticsCollection> => {
  const analyticsCollection = await fetchAnalyticsCollectionById(client, id);

  if (analyticsCollection) {
    throw new Error(ErrorCode.ANALYTICS_COLLECTION_ALREADY_EXISTS);
  }

  const result = await client.asCurrentUser.index({
    document,
    id,
    index: ANALYTICS_COLLECTIONS_INDEX,
  });

  await client.asCurrentUser.indices.refresh({ index: ANALYTICS_COLLECTIONS_INDEX });

  return {
    id: result._id,
    ...document,
  };
};

const getDataViewName = (collectionId: string): string => {
  return `elastic_analytics.events-${collectionId}`;
};

const getDataStreamName = (collectionId: string): string => {
  return `logs-${getDataViewName(collectionId)}`;
};

const createDataView = async (
  dataViewsService: DataViewsService,
  analyticsCollection: AnalyticsCollection
): Promise<DataView> => {
  return dataViewsService.createAndSave(
    {
      allowNoIndex: true,
      title: getDataStreamName(analyticsCollection.id),
      name: getDataViewName(analyticsCollection.id),
      timeFieldName: '@timestamp',
    },
    true
  );
};

export const addAnalyticsCollection = async (
  client: IScopedClusterClient,
  dataViewsService: DataViewsService,
  { name: collectionName }: AddAnalyticsCollectionRequestBody
): Promise<AnalyticsCollection> => {
  const id = toAlphanumeric(collectionName);
  const eventsDataStreamName = getDataStreamName(id);

  const document: AnalyticsCollectionDocument = {
    event_retention_day_length: 180,
    events_datastream: eventsDataStreamName,
    name: collectionName,
  };

  const analyticsCollectionIndexExists = await client.asCurrentUser.indices.exists({
    index: ANALYTICS_COLLECTIONS_INDEX,
  });

  if (!analyticsCollectionIndexExists) {
    await setupAnalyticsCollectionIndex(client.asCurrentUser);
  }

  const analyticsCollection = await createAnalyticsCollection(client, document, id);

  await createDataView(dataViewsService, analyticsCollection);

  return analyticsCollection;
};
