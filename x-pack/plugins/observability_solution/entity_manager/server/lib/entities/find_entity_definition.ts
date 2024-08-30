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
import { EntityDefinitionWithState } from './types';
import { isBackfillEnabled } from './helpers/is_backfill_enabled';

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
}): Promise<EntityDefinitionWithState[]> {
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

export async function findEntityDefinitionById({
  id,
  esClient,
  soClient,
}: {
  id: string;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
}) {
  const [definition] = await findEntityDefinitions({
    esClient,
    soClient,
    id,
    perPage: 1,
  });

  return definition;
}

async function getEntityDefinitionState(
  esClient: ElasticsearchClient,
  definition: EntityDefinition
) {
  const historyIngestPipelineId = generateHistoryIngestPipelineId(definition);
  const latestIngestPipelineId = generateLatestIngestPipelineId(definition);
  const transformIds = [
    generateHistoryTransformId(definition),
    generateLatestTransformId(definition),
    ...(isBackfillEnabled(definition) ? [generateHistoryBackfillTransformId(definition)] : []),
  ];
  const [ingestPipelines, indexTemplatesInstalled, transforms] = await Promise.all([
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
  ]);

  const ingestPipelinesInstalled = !!(
    ingestPipelines[historyIngestPipelineId] && ingestPipelines[latestIngestPipelineId]
  );
  const transformsInstalled = transforms.count === transformIds.length;
  const transformsRunning =
    transformsInstalled &&
    transforms.transforms.every(
      (transform) => transform.state === 'started' || transform.state === 'indexing'
    );

  return {
    installed: ingestPipelinesInstalled && transformsInstalled && indexTemplatesInstalled,
    running: transformsRunning,
  };
}
