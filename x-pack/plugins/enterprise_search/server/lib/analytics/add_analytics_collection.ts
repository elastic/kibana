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
import { isAlphaNumericOrUnderscore } from '../../../common/utils/is_alphanumeric_underscore';

import { fetchAnalyticsCollectionByName } from './fetch_analytics_collection';
import { setupAnalyticsCollectionIndex } from './setup_indices';

interface AddAnalyticsCollectionRequestBody {
  name: string;
}

const createAnalyticsCollection = async (
  client: IScopedClusterClient,
  document: AnalyticsCollectionDocument
): Promise<AnalyticsCollection> => {
  const analyticsCollection = await fetchAnalyticsCollectionByName(client, document.name);

  if (analyticsCollection) {
    throw new Error(ErrorCode.ANALYTICS_COLLECTION_ALREADY_EXISTS);
  }

  if (!isAlphaNumericOrUnderscore(document.name)) {
    throw new Error(ErrorCode.ANALYTICS_COLLECTION_NAME_INVALID);
  }

  // index the document
  const result = await client.asCurrentUser.index({
    document,
    index: ANALYTICS_COLLECTIONS_INDEX,
  });

  await client.asCurrentUser.indices.refresh({ index: ANALYTICS_COLLECTIONS_INDEX });

  return {
    id: result._id,
    ...document,
  };
};

const getDataViewName = ({ name: collectionName }: AnalyticsCollection): string => {
  return `elastic_analytics.events-${collectionName}`;
};

const getDataStreamName = ({ name: collectionName }: AnalyticsCollection): string => {
  return `logs-elastic_analytics.events-${collectionName}`;
};

const createDataView = async (
  dataViewsService: DataViewsService,
  analytcisCollection: AnalyticsCollection
): Promise<DataView> => {
  return dataViewsService.createAndSave(
    {
      title: getDataViewName(analytcisCollection),
      namespaces: [getDataStreamName(analytcisCollection)],
      allowNoIndex: true,
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
  const document: AnalyticsCollectionDocument = {
    event_retention_day_length: 180,
    name: collectionName,
  };

  const analyticsCollectionIndexExists = await client.asCurrentUser.indices.exists({
    index: ANALYTICS_COLLECTIONS_INDEX,
  });

  if (!analyticsCollectionIndexExists) {
    await setupAnalyticsCollectionIndex(client.asCurrentUser);
  }

  const analyticsCollection = await createAnalyticsCollection(client, document);

  await createDataView(dataViewsService, analyticsCollection);

  return analyticsCollection;
};
