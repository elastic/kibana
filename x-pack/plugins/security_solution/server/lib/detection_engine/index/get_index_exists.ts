/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';

/**
 * @deprecated Use the one from kbn-securitysolution-es-utils
 */
export const getIndexExists = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<boolean> => {
  try {
    const { body: response } = await esClient.search({
      index,
      size: 0,
      allow_no_indices: true,
      body: {
        terminate_after: 1,
      },
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
