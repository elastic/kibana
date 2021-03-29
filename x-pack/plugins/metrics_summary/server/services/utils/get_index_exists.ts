/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    const { body: response } = await esClient.search({
      allow_no_indices: true,
      index,
      size: 0,
      terminate_after: 1,
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
