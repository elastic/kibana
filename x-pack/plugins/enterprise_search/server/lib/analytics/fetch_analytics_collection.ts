/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { ANALYTICS_COLLECTIONS_INDEX } from '../..';
import { AnalyticsCollection } from '../../../common/types/analytics';

import { isIndexNotFoundException } from '../../utils/identify_exceptions';
import { fetchAll } from '../fetch_all';

import { setupAnalyticsCollectionIndex } from './setup_indices';

export const fetchAnalyticsCollectionById = async (
  client: IScopedClusterClient,
  id: string
): Promise<AnalyticsCollection | undefined> => {
  try {
    const hit = await client.asCurrentUser.get<AnalyticsCollection>({
      id,
      index: ANALYTICS_COLLECTIONS_INDEX,
    });

    const result = hit._source ? { ...hit._source, id: hit._id } : undefined;

    return result;
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      await setupAnalyticsCollectionIndex(client.asCurrentUser);
    }
    return undefined;
  }
};

export const fetchAnalyticsCollections = async (
  client: IScopedClusterClient
): Promise<AnalyticsCollection[]> => {
  const query: QueryDslQueryContainer = { match_all: {} };

  try {
    return await fetchAll<AnalyticsCollection>(client, ANALYTICS_COLLECTIONS_INDEX, query);
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      await setupAnalyticsCollectionIndex(client.asCurrentUser);
      return [];
    }
    throw error;
  }
};
