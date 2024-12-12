/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export const getIngestPipelineName = (namespace: string): string => {
  return `entity_analytics_add_ingest_timestamp-pipeline-${namespace}`;
};

export const createIngestTimestampPipeline = async (
  esClient: ElasticsearchClient,
  namespace: string
) => {
  const ingestTimestampPipeline = getIngestPipelineName(namespace);

  try {
    const pipeline = {
      id: ingestTimestampPipeline,
      body: {
        _meta: {
          managed_by: 'entity_analytics',
          managed: true,
        },
        description: 'Pipeline for adding event timestamp',
        processors: [
          {
            set: {
              field: '@timestamp',
              value: '{{_ingest.timestamp}}',
            },
          },
          {
            set: {
              field: 'error.message',
              value: '{{ _ingest.on_failure_message }}',
            },
          },
        ],
      },
    };

    await esClient.ingest.putPipeline(pipeline);
  } catch (e) {
    throw new Error(`Error creating ingest pipeline: ${e}`);
  }
};
