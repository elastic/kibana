/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { AnalyticsCollection } from '../../../common/types/analytics';
import { ErrorCode } from '../../../common/types/error_codes';

import { isResourceNotFoundException } from '../../utils/identify_exceptions';

export const fetchAnalyticsCollections = async (
  client: IScopedClusterClient,
  query: string = ''
): Promise<AnalyticsCollection[]> => {
  try {
    const collections = await client.asCurrentUser.searchApplication.getBehavioralAnalytics({
      name: [query],
    });

    return Object.keys(collections).map((value) => {
      const entry = collections[value];
      return {
        events_datastream: entry.event_data_stream.name,
        name: value,
      };
    });
  } catch (error) {
    if (isResourceNotFoundException(error)) {
      throw new Error(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND);
    }
    throw error;
  }
};
