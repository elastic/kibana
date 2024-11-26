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

interface BaseParams {
  scopedClusterClient: IScopedClusterClient;
}

interface BaseParamsWithDefinition extends BaseParams {
  definition: StreamDefinition;
}

interface DeleteStreamParams extends BaseParams {
  id: string;
  logger: Logger;
}

export async function deleteStreamObjects({ id, scopedClusterClient, logger }: DeleteStreamParams) {
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
  await scopedClusterClient.asInternalUser.delete({
    id,
    index: STREAMS_INDEX,
    refresh: 'wait_for',
  });
}

async function upsertInternalStream({ definition, scopedClusterClient }: BaseParamsWithDefinition) {
  return scopedClusterClient.asInternalUser.index({
    id: definition.id,
    index: STREAMS_INDEX,
    document: definition,
    refresh: 'wait_for',
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
  const definitions = response.hits.hits.map((hit) => hit._source!);
  const total = response.hits.total!;

  return {
    definitions,
    total: typeof total === 'number' ? total : total.value,
  };
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
      definition,
    };
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      throw new DefinitionNotFound(`Stream definition for ${id} not found.`);
    }
    throw e;
  }
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
  definition: StreamDefinition;
  rootDefinition?: StreamDefinition;
  logger: Logger;
}

export async function syncStream({
  scopedClusterClient,
  definition,
  rootDefinition,
  logger,
}: SyncStreamParams) {
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
  await rolloverDataStreamIfNecessary({
    esClient: scopedClusterClient.asCurrentUser,
    name: definition.id,
    logger,
    mappings: componentTemplate.template.mappings?.properties,
  });
}
