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

export const fetchAnalyticsCollectionByName = async (
  client: IScopedClusterClient,
  name: string
): Promise<AnalyticsCollection | undefined> => {
  try {
    const searchResults = await client.asCurrentUser.search<AnalyticsCollection>({
      index: ANALYTICS_COLLECTIONS_INDEX,
      query: { term: { name } },
    });

    const result = searchResults.hits.hits[0]?._source
      ? { ...searchResults.hits.hits[0]._source, id: searchResults.hits.hits[0]._id }
      : undefined;

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
