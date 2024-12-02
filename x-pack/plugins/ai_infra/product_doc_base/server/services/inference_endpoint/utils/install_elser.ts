/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';

export const installElser = async ({
  inferenceId,
  client,
  log,
}: {
  inferenceId: string;
  client: ElasticsearchClient;
  log: Logger;
}) => {
  await client.inference.put(
    {
      task_type: 'sparse_embedding',
      inference_id: inferenceId,
      inference_config: {
        service: 'elasticsearch',
        service_settings: {
          adaptive_allocations: { enabled: true },
          num_threads: 1,
          model_id: '.elser_model_2',
        },
        task_settings: {},
      },
    },
    { requestTimeout: 5 * 60 * 1000 }
  );
};
