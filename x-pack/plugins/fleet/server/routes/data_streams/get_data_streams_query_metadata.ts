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
      _source: false,
      fields: ['event.ingested'],
      // We need to use `body` to control the `sort` value here, because otherwise
      // it's just appended as a query string to the search operation and we can't
      // set `unmapped_type` for cases where `event.ingested` is not defiend, e.g.
      // in custom logs or custom HTTPJSON integrations
      body: {
        sort: {
          'event.ingested': {
            order: 'desc',
            // Necessary because of https://github.com/elastic/elasticsearch/issues/81960
            missing: 0,
            unmapped_type: 'long',
          },
        },
      },
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
