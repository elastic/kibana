/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from 'kibana/server';

import type { Logger } from '../../../../../src/core/server';

interface GetTransformsOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
}

// TODO: Type the Promise<unknown> to a stronger type
export const getTransforms = async ({ esClient }: GetTransformsOptions): Promise<unknown> => {
  const { body } = await esClient.transform.getTransform({
    size: 1000,
    transform_id: '*',
  });
  return body;
};
