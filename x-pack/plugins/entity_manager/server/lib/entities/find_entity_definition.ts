/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { EntityDefinition, EntityDefinitionWithState } from '@kbn/entities-schema';
import { SO_ENTITY_DEFINITION_TYPE } from '../../saved_objects';
import {
  generateHistoryTransformId,
  generateHistoryBackfillTransformId,
  generateHistoryIngestPipelineId,
  generateHistoryIndexTemplateId,
  generateLatestTransformId,
  generateLatestIngestPipelineId,
  generateLatestIndexTemplateId,
} from './helpers/generate_component_id';
import { BUILT_IN_ID_PREFIX } from './built_in';
import { isBackfillEnabled } from './helpers/is_backfill_enabled';
import { getEntityDefinitionStats } from './get_entity_definition_stats';

export async function findEntityDefinitions<TIncludeState extends boolean | undefined>({
  soClient,
  esClient,
  builtIn,
  id,
  page = 1,
  perPage = 10,
  includeState,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  builtIn?: boolean;
  id?: string;
  page?: number;
  perPage?: number;
  includeState?: TIncludeState;
}): Promise<TIncludeState extends true ? EntityDefinitionWithState[] : EntityDefinition[]> {
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

  if (!includeState) {
    return response.saved_objects.map(({ attributes }) => attributes) as TIncludeState extends true
      ? EntityDefinitionWithState[]
      : EntityDefinition[];
  }

  return Promise.all(
    response.saved_objects.map(async ({ attributes }) => {
      const [state, stats] = await Promise.all([
        getEntityDefinitionState(esClient, attributes),
        getEntityDefinitionStats(esClient, attributes),
      ]);
      return { ...attributes, ...state, stats };
    })
  );
}

export async function findEntityDefinitionById<TIncludeState extends boolean | undefined>({
  id,
  esClient,
  soClient,
  includeState,
}: {
  id: string;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  includeState?: TIncludeState;
}) {
  const [definition] = await findEntityDefinitions<TIncludeState>({
    esClient,
    soClient,
    id,
    perPage: 1,
    includeState,
  });

  return definition;
}

async function getEntityDefinitionState(
  esClient: ElasticsearchClient,
  definition: EntityDefinition
): Promise<Pick<EntityDefinitionWithState, 'state'>> {
  const historyIngestPipelineId = generateHistoryIngestPipelineId(definition);
  const latestIngestPipelineId = generateLatestIngestPipelineId(definition);
  const historyTransformId = generateHistoryTransformId(definition);
  const latestTransformId = generateLatestTransformId(definition);

  const transformIds = [
    historyTransformId,
    latestTransformId,
    ...(isBackfillEnabled(definition) ? [generateHistoryBackfillTransformId(definition)] : []),
  ];
  const [ingestPipelines, indexTemplatesInstalled, transformStats, transforms] = await Promise.all([
    esClient.ingest.getPipeline(
      {
        id: `${historyIngestPipelineId},${latestIngestPipelineId}`,
      },
      { ignore: [404] }
    ),
    esClient.indices.existsIndexTemplate({
      name: `${
        (generateLatestIndexTemplateId(definition), generateHistoryIndexTemplateId(definition))
      }`,
    }),
    esClient.transform.getTransformStats({
      transform_id: transformIds,
    }),
    esClient.transform.getTransform({
      transform_id: [historyTransformId, latestTransformId],
    }),
  ]);

  const ingestPipelinesInstalled = !!(
    ingestPipelines[historyIngestPipelineId] && ingestPipelines[latestIngestPipelineId]
  );
  const transformsInstalled = transforms.count === transformIds.length;
  const transformsRunning =
    transformsInstalled &&
    transformStats.transforms.every(
      (transform) => transform.state === 'started' || transform.state === 'indexing'
    );

  const historyTransform = transforms.transforms.find(
    (transform) => transform.id === historyTransformId
  );
  const latestTransform = transforms.transforms.find(
    (transform) => transform.id === latestTransformId
  );
  const historyTransformStats = transformStats.transforms.find(
    (transform) => transform.id === historyTransformId
  );
  const latestTransformStats = transformStats.transforms.find(
    (transform) => transform.id === latestTransformId
  );

  return {
    state: {
      installed: ingestPipelinesInstalled && transformsInstalled && indexTemplatesInstalled,
      running: transformsRunning,
      avgCheckpointDuration: {
        history: historyTransformStats?.stats.exponential_avg_checkpoint_duration_ms ?? null,
        latest: latestTransformStats?.stats.exponential_avg_checkpoint_duration_ms ?? null,
      },
      resources: {
        ingestPipelines,
        transforms: {
          history: historyTransform,
          latest: latestTransform,
          stats: {
            history: historyTransformStats,
            latest: latestTransformStats,
          },
        },
      },
    },
  };
}
