/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export const deleteInferenceEndpoint = async (
  client: ElasticsearchClient,
  type: string,
  id: string
): Promise<void> => {
  return await client.transport.request({
    method: 'DELETE',
    path: `/_inference/${type}/${id}`,
  });
};
