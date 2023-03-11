/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

const getFullIndexName = (indexName: string): string => {
  return `.ds-logs-elastic_analytics.events-${indexName}-*`;
};

export const analyticsEventsIndexExists = async (
  client: IScopedClusterClient,
  indexName: string
): Promise<boolean> => {
  return await client.asCurrentUser.indices.exists({
    index: getFullIndexName(indexName),
    allow_no_indices: false,
  });
};
