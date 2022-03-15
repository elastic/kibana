/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';

/**
 * Tried and true, copied forever again and again, the way we check if an index exists
 * with the least amount of privileges.
 * @param esClient The client to check if the index already exists
 * @param index The index to check for
 * @returns true if it exists, otherwise false
 */
export const getIndexExists = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<boolean> => {
  try {
    const response = await esClient.search({
      allow_no_indices: true,
      body: {
        terminate_after: 1,
      },
      index,
      size: 0,
    });
    return response._shards.total > 0;
  } catch (err) {
    if (err.body?.status === 404) {
      return false;
    } else {
      throw err.body ? err.body : err;
    }
  }
};
