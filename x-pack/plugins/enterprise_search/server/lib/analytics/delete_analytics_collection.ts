/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { ANALYTICS_COLLECTIONS_INDEX } from '../..';

import { ErrorCode } from '../../../common/types/error_codes';

import { fetchAnalyticsCollectionByName } from './fetch_analytics_collection';

export const deleteAnalyticsCollectionByName = async (
  client: IScopedClusterClient,
  name: string
) => {
  const analyticsCollection = await fetchAnalyticsCollectionByName(client, name);

  if (!analyticsCollection) {
    throw new Error(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND);
  }

  await client.asCurrentUser.delete({
    id: analyticsCollection.id,
    index: ANALYTICS_COLLECTIONS_INDEX,
  });
};
