/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';

export const getTransformExists = async (
  esClient: ElasticsearchClient,
  id: string
): Promise<boolean> => {
  try {
    const { count } = await esClient.transform.getTransform({
      size: 1000,
      transform_id: id,
    });
    return count > 0;
  } catch (err) {
    if (err.body?.status === 404) {
      return false;
    } else {
      throw err.body ? err.body : err;
    }
  }
};
