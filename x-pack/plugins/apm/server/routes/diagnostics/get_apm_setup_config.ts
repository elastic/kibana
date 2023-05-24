/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient } from '@kbn/core/server';
import type { TransportRequestOptions } from '@elastic/elasticsearch';

export async function getApmTemplates({
  esClient,
  options,
}: {
  esClient: ElasticsearchClient;
  options: TransportRequestOptions;
}) {
  const response = await esClient.transport.request(
    {
      method: 'GET',
      path: `/_component_template/*apm*`,
    },
    options
  );

  return response;
}

export async function getApmPipelines({
  esClient,
  options,
}: {
  esClient: ElasticsearchClient;
  options: TransportRequestOptions;
}) {
  const response = await esClient.transport.request(
    {
      method: 'GET',
      path: `/_ingest/pipeline/*apm*`,
    },
    options
  );

  return response;
}

export async function getApmIntexTemplate({
  esClient,
  options,
}: {
  esClient: ElasticsearchClient;
  options: TransportRequestOptions;
}) {
  const response = await esClient.transport.request(
    {
      method: 'GET',
      path: `/_index_template/*apm*`,
    },
    options
  );

  return response;
}
