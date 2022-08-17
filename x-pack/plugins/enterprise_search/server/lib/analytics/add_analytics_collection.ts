/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IScopedClusterClient } from '@kbn/core/server';
import { ANALYTICS_COLLECTIONS_INDEX } from '../..';
import { AnalyticsCollectionDocument, AnalyticsCollection } from '../../../common/types/analytics';

import { ErrorCode } from '../../../common/types/error_codes';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';
import { fetchAnalyticsCollectionByName } from './fetch_analytics_collection';
import { setupAnalyticsCollectionIndex } from './setup_indices';

const createAnalyticsCollection = async (
  client: IScopedClusterClient,
  document: AnalyticsCollectionDocument
): Promise<AnalyticsCollection> => {
  const analyticsCollection = await fetchAnalyticsCollectionByName(client, document.name);

  if (analyticsCollection) {
    throw new Error(ErrorCode.ANALYTICS_COLLECTION_ALREADY_EXISTS);
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

export const addAnalyticsCollection = async (
  client: IScopedClusterClient,
  input: { name: string }
): Promise<AnalyticsCollection> => {
  const document: AnalyticsCollectionDocument = {
    event_retention_day_length: 180,
    name: input.name,
  };

  try {
    return await createAnalyticsCollection(client, document);
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      await setupAnalyticsCollectionIndex(client.asCurrentUser);
      return await createAnalyticsCollection(client, document);
    } else {
      throw error;
    }
  }
};
