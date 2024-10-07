/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import { getDefinitionForEntityType } from '../definition';
import { getFieldRetentionDefinition, getFieldRetentionPipelineSteps } from '../field_retention';

const getPlatformPipelineId = (definition: ReturnType<typeof getDefinitionForEntityType>) => {
  return `${definition.id}-latest@platform`;
};
export const createPlatformPipeline = async ({
  namespace,
  entityType,
  fieldHistoryLength,
  logger,
  esClient,
}: {
  namespace: string;
  fieldHistoryLength: number;
  entityType: EntityType;
  logger: Logger;
  esClient: ElasticsearchClient;
}) => {
  const definition = getDefinitionForEntityType(entityType, namespace);
  const fieldRetentionDefinition = getFieldRetentionDefinition({
    entityType,
    fieldHistoryLength,
  });
  const allEntityFields: string[] = (definition?.metadata || []).map((m) => {
    if (typeof m === 'string') {
      return m;
    }

    return m.destination;
  });

  const pipeline = {
    id: getPlatformPipelineId(definition),
    body: {
      _meta: {
        managed_by: 'entity_store',
        managed: true,
      },
      description: `Ingest pipeline for entity defiinition ${definition.id}`,
      processors: getFieldRetentionPipelineSteps({
        namespace,
        fieldRetentionDefinition,
        allEntityFields,
      }),
    },
  };

  logger.debug(`Attempting to create pipeline: ${JSON.stringify(pipeline)}`);

  await esClient.ingest.putPipeline(pipeline);
};

export const deletePlatformPipeline = ({
  entityType,
  namespace,
  logger,
  esClient,
}: {
  entityType: EntityType;
  namespace: string;
  logger: Logger;
  esClient: ElasticsearchClient;
}) => {
  const definition = getDefinitionForEntityType(entityType, namespace);
  const pipelineId = getPlatformPipelineId(definition);
  logger.debug(`Attempting to delete pipeline: ${pipelineId}`);
  return esClient.ingest.deletePipeline(
    {
      id: pipelineId,
    },
    {
      ignore: [404],
    }
  );
};
