/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { SO_ENTITY_DEFINITION_TYPE } from '../../saved_objects';
import { generateHistoryIngestPipelineId } from './ingest_pipeline/generate_history_ingest_pipeline_id';
import { generateLatestIngestPipelineId } from './ingest_pipeline/generate_latest_ingest_pipeline_id';
import { generateHistoryTransformId } from './transform/generate_history_transform_id';
import { generateLatestTransformId } from './transform/generate_latest_transform_id';
import { BUILT_IN_ID_PREFIX } from './built_in';

export async function findEntityDefinitions({
  soClient,
  esClient,
  builtIn,
  id,
  page = 1,
  perPage = 10,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  builtIn?: boolean;
  id?: string;
  page?: number;
  perPage?: number;
}): Promise<Array<EntityDefinition & { state: { installed: boolean; running: boolean } }>> {
  const filter = compact([
    typeof builtIn === 'boolean'
      ? `${SO_ENTITY_DEFINITION_TYPE}.attributes.id:(${BUILT_IN_ID_PREFIX}*)`
      : undefined,
    id ? `${SO_ENTITY_DEFINITION_TYPE}.attributes.id:(${id})` : undefined,
  ]).join(' AND ');
  const response = await soClient.find<EntityDefinition>({
    type: SO_ENTITY_DEFINITION_TYPE,
    filter,
    page,
    perPage,
  });

  return Promise.all(
    response.saved_objects.map(async ({ attributes }) => {
      const state = await getEntityDefinitionState(esClient, attributes);
      return { ...attributes, state };
    })
  );
}

async function getEntityDefinitionState(
  esClient: ElasticsearchClient,
  definition: EntityDefinition
) {
  const historyIngestPipelineId = generateHistoryIngestPipelineId(definition);
  const latestIngestPipelineId = generateLatestIngestPipelineId(definition);
  const [ingestPipelines, transforms] = await Promise.all([
    esClient.ingest.getPipeline({
      id: `${historyIngestPipelineId},${latestIngestPipelineId}`,
    }),
    esClient.transform.getTransformStats({
      transform_id: [generateHistoryTransformId(definition), generateLatestTransformId(definition)],
    }),
  ]);

  const ingestPipelinesInstalled = !!(
    ingestPipelines[historyIngestPipelineId] && ingestPipelines[latestIngestPipelineId]
  );
  const transformsInstalled = transforms.count === 2;
  const transformsRunning =
    transformsInstalled &&
    transforms.transforms.every(
      (transform) => transform.state === 'started' || transform.state === 'indexing'
    );

  return {
    installed: ingestPipelinesInstalled && transformsInstalled,
    running: transformsRunning,
  };
}
