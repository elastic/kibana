/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core/server';
import type { TransportRequestOptions } from '@elastic/elasticsearch';

const esClientRequestOptions: TransportRequestOptions = {
  ignore: [404],
};

export async function getApmPipelines({
  esClient,
}: {
  esClient: ElasticsearchClient;
}) {
  const response = await esClient.transport.request(
    {
      method: 'GET',
      path: `/_ingest/pipeline/*apm*`,
    },
    esClientRequestOptions
  );

  return response;
}
