/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from 'kibana/server';

export const getTransformExists = async (
  esClient: ElasticsearchClient,
  id: string
): Promise<boolean> => {
  // TODO: Type this getTransform rather than letting count stay as "any"
  try {
    const {
      body: { count },
    } = await esClient.transform.getTransform({
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
