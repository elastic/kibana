/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export const fetchInferenceEndpoints = async (
  client: ElasticsearchClient
): Promise<{
  inferenceEndpoints: any;
}> => {
  const { endpoints } = await client.transport.request<{
    endpoints: any;
  }>({
    method: 'GET',
    path: `/_inference/_all`,
  });

  return {
    inferenceEndpoints: endpoints,
  };
};
