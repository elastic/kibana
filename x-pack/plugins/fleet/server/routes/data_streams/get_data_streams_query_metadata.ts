/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';

export async function getDataStreamsQueryMetadata({
  dataStreamName,
  esClient,
}: {
  dataStreamName: string;
  esClient: ElasticsearchClient;
}) {
  const [
    maxEventIngestedResponse,
    namespaceResponse,
    datasetResponse,
    typeResponse,
    serviceNameResponse,
    environmentResponse,
  ] = await Promise.all([
    esClient.search({
      size: 1,
      index: dataStreamName,
      sort: 'event.ingested:desc',
      _source: false,
      fields: ['event.ingested'],
    }),
    esClient.termsEnum({
      index: dataStreamName,
      field: 'data_stream.namespace',
    }),
    esClient.termsEnum({
      index: dataStreamName,
      field: 'data_stream.dataset',
    }),
    esClient.termsEnum({
      index: dataStreamName,
      field: 'data_stream.type',
    }),
    esClient.termsEnum({
      index: dataStreamName,
      field: 'service.name',
      size: 2,
    }),
    esClient.termsEnum({
      index: dataStreamName,
      field: 'service.environment',
      size: 2,
    }),
  ]);

  const maxIngested =
    maxEventIngestedResponse.hits.hits[0]?.fields !== undefined
      ? new Date(maxEventIngestedResponse.hits.hits[0].fields['event.ingested']).getTime()
      : undefined;

  const namespace = namespaceResponse.terms[0] ?? '';
  const dataset = datasetResponse.terms[0] ?? '';
  const type = typeResponse.terms[0] ?? '';
  const serviceNames = serviceNameResponse.terms;
  const environments =
    environmentResponse.terms.length > 0 ? environmentResponse.terms : ['ENVIRONMENT_NOT_DEFINED'];

  return {
    maxIngested,
    namespace,
    dataset,
    type,
    serviceNames,
    environments,
  };
}
