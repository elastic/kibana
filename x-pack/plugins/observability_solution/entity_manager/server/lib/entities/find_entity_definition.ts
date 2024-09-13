/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, forEach, reduce } from 'lodash';
import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';
import { NodesIngestTotal } from '@elastic/elasticsearch/lib/api/types';
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
import { EntityDefinitionState, EntityDefinitionWithState } from './types';
import { isBackfillEnabled } from './helpers/is_backfill_enabled';

export async function findEntityDefinitions({
  soClient,
  esClient,
  builtIn,
  id,
  page = 1,
  perPage = 10,
  includeState = false,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  builtIn?: boolean;
  id?: string;
  page?: number;
  perPage?: number;
  includeState?: boolean;
}): Promise<EntityDefinition[] | EntityDefinitionWithState[]> {
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
    return response.saved_objects.map(({ attributes }) => attributes);
  }

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
  includeState = false,
}: {
  id: string;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  includeState?: boolean;
}) {
  const [definition] = await findEntityDefinitions({
    esClient,
    soClient,
    id,
    includeState,
    perPage: 1,
  });

  return definition;
}

async function getEntityDefinitionState(
  esClient: ElasticsearchClient,
  definition: EntityDefinition
): Promise<EntityDefinitionState> {
  const [ingestPipelines, transforms, indexTemplates] = await Promise.all([
    getIngestPipelineState({ definition, esClient }),
    getTransformState({ definition, esClient }),
    getIndexTemplatesState({ definition, esClient }),
  ]);

  const installed =
    ingestPipelines.every((pipeline) => pipeline.installed) &&
    transforms.every((transform) => transform.installed) &&
    indexTemplates.every((template) => template.installed);
  const running = transforms.every((transform) => transform.running);

  return {
    installed,
    running,
    components: { transforms, ingestPipelines, indexTemplates },
  };
}

async function getTransformState({
  definition,
  esClient,
}: {
  definition: EntityDefinition;
  esClient: ElasticsearchClient;
}) {
  const transformIds = [
    generateHistoryTransformId(definition),
    generateLatestTransformId(definition),
    ...(isBackfillEnabled(definition) ? [generateHistoryBackfillTransformId(definition)] : []),
  ];

  const transformStats = await Promise.all(
    transformIds.map((id) => esClient.transform.getTransformStats({ transform_id: id }))
  ).then((results) => results.map(({ transforms }) => transforms).flat());

  return transformIds.map((id) => {
    const stats = transformStats.find((transform) => transform.id === id);
    if (!stats) {
      return { id, installed: false, running: false };
    }

    return {
      id,
      installed: true,
      running: stats.state === 'started' || stats.state === 'indexing',
      stats,
    };
  });
}

async function getIngestPipelineState({
  definition,
  esClient,
}: {
  definition: EntityDefinition;
  esClient: ElasticsearchClient;
}) {
  const ingestPipelineIds = [
    generateHistoryIngestPipelineId(definition),
    generateLatestIngestPipelineId(definition),
  ];
  const [ingestPipelines, ingestPipelinesStats] = await Promise.all([
    esClient.ingest.getPipeline({ id: ingestPipelineIds.join(',') }, { ignore: [404] }),
    esClient.nodes.stats({
      metric: 'ingest',
      filter_path: ingestPipelineIds.map((id) => `nodes.*.ingest.pipelines.${id}`),
    }),
  ]);

  const ingestStatsByPipeline = reduce(
    ingestPipelinesStats.nodes,
    (pipelines, { ingest }) => {
      forEach(ingest?.pipelines, (value: NodesIngestTotal, key: string) => {
        if (!pipelines[key]) {
          pipelines[key] = { count: 0, failed: 0 };
        }
        pipelines[key].count += value.count ?? 0;
        pipelines[key].failed += value.failed ?? 0;
      });
      return pipelines;
    },
    {} as Record<string, { count: number; failed: number }>
  );

  return ingestPipelineIds.map((id) => ({
    id,
    installed: !!ingestPipelines[id],
    stats: ingestStatsByPipeline[id],
  }));
}

async function getIndexTemplatesState({
  definition,
  esClient,
}: {
  definition: EntityDefinition;
  esClient: ElasticsearchClient;
}) {
  const indexTemplatesIds = [
    generateLatestIndexTemplateId(definition),
    generateHistoryIndexTemplateId(definition),
  ];
  const templates = await Promise.all(
    indexTemplatesIds.map((id) =>
      esClient.indices
        .getIndexTemplate({ name: id }, { ignore: [404] })
        .then(({ index_templates: indexTemplates }) => indexTemplates?.[0])
    )
  ).then(compact);
  return indexTemplatesIds.map((id) => {
    const template = templates.find(({ name }) => name === id);
    if (!template) {
      return { id, installed: false };
    }
    return {
      id,
      installed: true,
      stats: template.index_template,
    };
  });
}
