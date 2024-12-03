/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { STREAMS_INDEX } from '../../../common/constants';
import { FieldDefinition, StreamDefinition } from '../../../common/types';
import { generateLayer } from './component_templates/generate_layer';
import { deleteComponent, upsertComponent } from './component_templates/manage_component_templates';
import { getComponentTemplateName } from './component_templates/name';
import {
  deleteDataStream,
  rolloverDataStreamIfNecessary,
  upsertDataStream,
} from './data_streams/manage_data_streams';
import { DefinitionNotFound } from './errors';
import { MalformedFields } from './errors/malformed_fields';
import { getAncestors } from './helpers/hierarchy';
import { generateIndexTemplate } from './index_templates/generate_index_template';
import { deleteTemplate, upsertTemplate } from './index_templates/manage_index_templates';
import { getIndexTemplateName } from './index_templates/name';
import { generateIngestPipeline } from './ingest_pipelines/generate_ingest_pipeline';
import { generateReroutePipeline } from './ingest_pipelines/generate_reroute_pipeline';
import {
  deleteIngestPipeline,
  upsertIngestPipeline,
} from './ingest_pipelines/manage_ingest_pipelines';
import { getProcessingPipelineName, getReroutePipelineName } from './ingest_pipelines/name';
import { AssetClient } from './assets/asset_client';

interface BaseParams {
  scopedClusterClient: IScopedClusterClient;
}

interface BaseParamsWithDefinition extends BaseParams {
  definition: StreamDefinition;
}

interface DeleteStreamParams extends BaseParams {
  id: string;
  logger: Logger;
  assetClient: AssetClient;
}

export async function deleteStreamObjects({
  id,
  scopedClusterClient,
  logger,
  assetClient,
}: DeleteStreamParams) {
  await deleteDataStream({
    esClient: scopedClusterClient.asCurrentUser,
    name: id,
    logger,
  });
  await deleteTemplate({
    esClient: scopedClusterClient.asCurrentUser,
    name: getIndexTemplateName(id),
    logger,
  });
  await deleteComponent({
    esClient: scopedClusterClient.asCurrentUser,
    name: getComponentTemplateName(id),
    logger,
  });
  await deleteIngestPipeline({
    esClient: scopedClusterClient.asCurrentUser,
    id: getProcessingPipelineName(id),
    logger,
  });
  await deleteIngestPipeline({
    esClient: scopedClusterClient.asCurrentUser,
    id: getReroutePipelineName(id),
    logger,
  });
  await assetClient.syncAssetList({
    entityId: id,
    entityType: 'stream',
    assetType: 'dashboard',
    assetIds: [],
  });
  await scopedClusterClient.asInternalUser.delete({
    id,
    index: STREAMS_INDEX,
    refresh: 'wait_for',
  });
}

async function upsertInternalStream({
  definition: { dashboards, ...definition },
  scopedClusterClient,
}: BaseParamsWithDefinition) {
  return scopedClusterClient.asInternalUser.index({
    id: definition.id,
    index: STREAMS_INDEX,
    document: { ...definition, managed: true },
    refresh: 'wait_for',
  });
}

async function syncAssets({
  definition,
  assetClient,
}: {
  definition: StreamDefinition;
  assetClient: AssetClient;
}) {
  await assetClient.syncAssetList({
    entityId: definition.id,
    entityType: 'stream',
    assetType: 'dashboard',
    assetIds: definition.dashboards ?? [],
  });
}

type ListStreamsParams = BaseParams;

export interface ListStreamResponse {
  total: number;
  definitions: StreamDefinition[];
}

export async function listStreams({
  scopedClusterClient,
}: ListStreamsParams): Promise<ListStreamResponse> {
  const response = await scopedClusterClient.asInternalUser.search<StreamDefinition>({
    index: STREAMS_INDEX,
    size: 10000,
    sort: [{ id: 'asc' }],
  });

  const dataStreams = await listDataStreamsAsStreams({ scopedClusterClient });
  const definitions = response.hits.hits.map((hit) => ({ ...hit._source!, managed: true }));
  const total = response.hits.total!;

  return {
    definitions: [...definitions, ...dataStreams],
    total: (typeof total === 'number' ? total : total.value) + dataStreams.length,
  };
}

export async function listDataStreamsAsStreams({
  scopedClusterClient,
}: ListStreamsParams): Promise<StreamDefinition[]> {
  const response = await scopedClusterClient.asInternalUser.indices.getDataStream();
  return response.data_streams
    .filter((dataStream) => dataStream.template.endsWith('@stream') === false)
    .map((dataStream) => ({
      id: dataStream.name,
      managed: false,
      children: [],
      fields: [],
      processing: [],
    }));
}

interface ReadStreamParams extends BaseParams {
  id: string;
  skipAccessCheck?: boolean;
}

export interface ReadStreamResponse {
  definition: StreamDefinition;
}

export async function readStream({
  id,
  scopedClusterClient,
  skipAccessCheck,
}: ReadStreamParams): Promise<ReadStreamResponse> {
  try {
    const response = await scopedClusterClient.asInternalUser.get<StreamDefinition>({
      id,
      index: STREAMS_INDEX,
    });
    const definition = response._source as StreamDefinition;
    if (!skipAccessCheck) {
      const hasAccess = await checkReadAccess({ id, scopedClusterClient });
      if (!hasAccess) {
        throw new DefinitionNotFound(`Stream definition for ${id} not found.`);
      }
    }
    return {
      definition: {
        ...definition,
        managed: true,
      },
    };
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      return readDataStreamAsStream({ id, scopedClusterClient, skipAccessCheck });
    }
    throw e;
  }
}

export async function readDataStreamAsStream({
  id,
  scopedClusterClient,
  skipAccessCheck,
}: ReadStreamParams) {
  const response = await scopedClusterClient.asInternalUser.indices.getDataStream({ name: id });
  if (response.data_streams.length === 1) {
    const definition: StreamDefinition = {
      id,
      managed: false,
      children: [],
      fields: [],
      processing: [],
    };
    if (!skipAccessCheck) {
      const hasAccess = await checkReadAccess({ id, scopedClusterClient });
      if (!hasAccess) {
        throw new DefinitionNotFound(`Stream definition for ${id} not found.`);
      }
    }
    // retrieve linked index template, component template and ingest pipeline
    const templateName = response.data_streams[0].template;
    const componentTemplates: string[] = [];
    const template = await scopedClusterClient.asInternalUser.indices.getIndexTemplate({
      name: templateName,
    });
    if (template.index_templates.length) {
      template.index_templates[0].index_template.composed_of.forEach((componentTemplateName) => {
        componentTemplates.push(componentTemplateName);
      });
    }
    const writeIndexName = response.data_streams[0].indices.at(-1)?.index_name!;
    const currentIndex = await scopedClusterClient.asInternalUser.indices.get({
      index: writeIndexName,
    });
    const ingestPipelineId = currentIndex[writeIndexName].settings?.index?.default_pipeline!;

    definition.unmanaged_elasticsearch_assets = [
      {
        type: 'ingest_pipeline',
        id: ingestPipelineId,
      },
      ...componentTemplates.map((componentTemplateName) => ({
        type: 'component_template' as const,
        id: componentTemplateName,
      })),
      {
        type: 'index_template',
        id: templateName,
      },
      {
        type: 'data_stream',
        id,
      },
    ];

    return { definition };
  }
  throw new DefinitionNotFound(`Stream definition for ${id} not found.`);
}

interface ReadAncestorsParams extends BaseParams {
  id: string;
}

export interface ReadAncestorsResponse {
  ancestors: Array<{ definition: StreamDefinition }>;
}

export async function readAncestors({
  id,
  scopedClusterClient,
}: ReadAncestorsParams): Promise<ReadAncestorsResponse> {
  const ancestorIds = getAncestors(id);

  return {
    ancestors: await Promise.all(
      ancestorIds.map((ancestorId) => readStream({ scopedClusterClient, id: ancestorId }))
    ),
  };
}

interface ReadDescendantsParams extends BaseParams {
  id: string;
}

export async function readDescendants({ id, scopedClusterClient }: ReadDescendantsParams) {
  const response = await scopedClusterClient.asInternalUser.search<StreamDefinition>({
    index: STREAMS_INDEX,
    size: 10000,
    body: {
      query: {
        bool: {
          filter: {
            prefix: {
              id,
            },
          },
          must_not: {
            term: {
              id,
            },
          },
        },
      },
    },
  });
  return response.hits.hits.map((hit) => hit._source as StreamDefinition);
}

export async function validateAncestorFields(
  scopedClusterClient: IScopedClusterClient,
  id: string,
  fields: FieldDefinition[]
) {
  const { ancestors } = await readAncestors({
    id,
    scopedClusterClient,
  });
  for (const ancestor of ancestors) {
    for (const field of fields) {
      if (
        ancestor.definition.fields.some(
          (ancestorField) => ancestorField.type !== field.type && ancestorField.name === field.name
        )
      ) {
        throw new MalformedFields(
          `Field ${field.name} is already defined with incompatible type in the parent stream ${ancestor.definition.id}`
        );
      }
    }
  }
}

export async function validateDescendantFields(
  scopedClusterClient: IScopedClusterClient,
  id: string,
  fields: FieldDefinition[]
) {
  const descendants = await readDescendants({
    id,
    scopedClusterClient,
  });
  for (const descendant of descendants) {
    for (const field of fields) {
      if (
        descendant.fields.some(
          (descendantField) =>
            descendantField.type !== field.type && descendantField.name === field.name
        )
      ) {
        throw new MalformedFields(
          `Field ${field.name} is already defined with incompatible type in the child stream ${descendant.id}`
        );
      }
    }
  }
}

export async function checkStreamExists({ id, scopedClusterClient }: ReadStreamParams) {
  try {
    await readStream({ id, scopedClusterClient });
    return true;
  } catch (e) {
    if (e instanceof DefinitionNotFound) {
      return false;
    }
    throw e;
  }
}

interface CheckReadAccessParams extends BaseParams {
  id: string;
}

export async function checkReadAccess({
  id,
  scopedClusterClient,
}: CheckReadAccessParams): Promise<boolean> {
  try {
    return await scopedClusterClient.asCurrentUser.indices.exists({ index: id });
  } catch (e) {
    return false;
  }
}

interface SyncStreamParams {
  scopedClusterClient: IScopedClusterClient;
  assetClient: AssetClient;
  definition: StreamDefinition;
  rootDefinition?: StreamDefinition;
  logger: Logger;
}

export async function syncStream({
  scopedClusterClient,
  assetClient,
  definition,
  rootDefinition,
  logger,
}: SyncStreamParams) {
  if (!definition.managed) {
    // TODO For now, we just don't allow reads at all - later on we will relax this to allow certain operations, but they will use a completely different syncing logic
    throw new Error('Cannot sync an unmanaged stream');
  }
  const componentTemplate = generateLayer(definition.id, definition);
  await upsertComponent({
    esClient: scopedClusterClient.asCurrentUser,
    logger,
    component: componentTemplate,
  });
  await upsertIngestPipeline({
    esClient: scopedClusterClient.asCurrentUser,
    logger,
    pipeline: generateIngestPipeline(definition.id, definition),
  });
  const reroutePipeline = await generateReroutePipeline({
    definition,
  });
  await upsertIngestPipeline({
    esClient: scopedClusterClient.asCurrentUser,
    logger,
    pipeline: reroutePipeline,
  });
  await upsertTemplate({
    esClient: scopedClusterClient.asCurrentUser,
    logger,
    template: generateIndexTemplate(definition.id),
  });
  if (rootDefinition) {
    const parentReroutePipeline = await generateReroutePipeline({
      definition: rootDefinition,
    });
    await upsertIngestPipeline({
      esClient: scopedClusterClient.asCurrentUser,
      logger,
      pipeline: parentReroutePipeline,
    });
  }
  await upsertDataStream({
    esClient: scopedClusterClient.asCurrentUser,
    logger,
    name: definition.id,
  });
  await upsertInternalStream({
    scopedClusterClient,
    definition,
  });
  await syncAssets({
    definition,
    assetClient,
  });
  await rolloverDataStreamIfNecessary({
    esClient: scopedClusterClient.asCurrentUser,
    name: definition.id,
    logger,
    mappings: componentTemplate.template.mappings?.properties,
  });
}

export async function streamsEnabled({ scopedClusterClient }: BaseParams) {
  return await scopedClusterClient.asInternalUser.indices.exists({
    index: STREAMS_INDEX,
  });
}
