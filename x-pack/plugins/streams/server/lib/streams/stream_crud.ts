/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import {
  IngestStreamDefinition,
  WiredStreamDefinition,
  StreamDefinition,
  ListStreamsResponse,
  isWiredStream,
  FieldDefinition,
} from '@kbn/streams-schema';
import { omit } from 'lodash';
import { STREAMS_INDEX } from '../../../common/constants';
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
    id: definition.name,
    index: STREAMS_INDEX,
    document: { ...omit(definition, 'elasticsearch_assets') },
    refresh: 'wait_for',
  });
}

type ListStreamsParams = BaseParams;

export async function listStreams({
  scopedClusterClient,
}: ListStreamsParams): Promise<ListStreamsResponse> {
  const response = await scopedClusterClient.asInternalUser.search<WiredStreamDefinition>({
    index: STREAMS_INDEX,
    size: 10000,
    sort: [{ name: 'asc' }],
  });

  const dataStreams = await listDataStreamsAsStreams({ scopedClusterClient });
  let definitions = response.hits.hits.map((hit) => ({ ...hit._source!, managed: true }));
  const hasAccess = await Promise.all(
    definitions.map((definition) => checkReadAccess({ id: definition.name, scopedClusterClient }))
  );
  definitions = definitions.filter((_, index) => hasAccess[index]);

  return {
    streams: [...definitions, ...dataStreams],
  };
}

export async function listDataStreamsAsStreams({
  scopedClusterClient,
}: ListStreamsParams): Promise<IngestStreamDefinition[]> {
  const response = await scopedClusterClient.asInternalUser.indices.getDataStream();
  return response.data_streams
    .filter((dataStream) => dataStream.template.endsWith('@stream') === false)
    .map((dataStream) => ({
      name: dataStream.name,
      stream: {
        ingest: {
          processing: [],
        },
        routing: [],
      },
    }));
}

interface ReadStreamParams extends BaseParams {
  id: string;
  skipAccessCheck?: boolean;
}

export async function readStream({
  id,
  scopedClusterClient,
  skipAccessCheck,
}: ReadStreamParams): Promise<StreamDefinition> {
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
    return definition;
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
}: ReadStreamParams): Promise<IngestStreamDefinition> {
  let dataStream: IndicesDataStream;
  try {
    const response = await scopedClusterClient.asInternalUser.indices.getDataStream({ name: id });
    dataStream = response.data_streams[0];
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      throw new DefinitionNotFound(`Stream definition for ${id} not found.`);
    }
    throw e;
  }

  const definition: StreamDefinition = {
    name: id,
    stream: {
      routing: [],
      ingest: {
        processing: [],
      },
    },
  };

  if (!skipAccessCheck) {
    const hasAccess = await checkReadAccess({ id, scopedClusterClient });
    if (!hasAccess) {
      throw new DefinitionNotFound(`Stream definition for ${id} not found.`);
    }
  }
  // retrieve linked index template, component template and ingest pipeline
  const templateName = dataStream.template;
  const componentTemplates: string[] = [];
  const template = await scopedClusterClient.asInternalUser.indices.getIndexTemplate({
    name: templateName,
  });
  if (template.index_templates.length) {
    template.index_templates[0].index_template.composed_of.forEach((componentTemplateName) => {
      componentTemplates.push(componentTemplateName);
    });
  }
  const writeIndexName = dataStream.indices.at(-1)?.index_name!;
  const currentIndex = await scopedClusterClient.asInternalUser.indices.get({
    index: writeIndexName,
  });
  const ingestPipelineId = currentIndex[writeIndexName].settings?.index?.default_pipeline!;

  definition.elasticsearch_assets = [
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

  return definition;
}

interface ReadAncestorsParams extends BaseParams {
  id: string;
}

export interface ReadAncestorsResponse {
  ancestors: StreamDefinition[];
}

export async function readAncestors({
  id,
  scopedClusterClient,
}: ReadAncestorsParams): Promise<{ ancestors: WiredStreamDefinition[] }> {
  const ancestorIds = getAncestors(id);

  return {
    ancestors: await Promise.all(
      ancestorIds.map(
        (ancestorId) =>
          readStream({
            scopedClusterClient,
            id: ancestorId,
            skipAccessCheck: true,
          }) as unknown as WiredStreamDefinition
      )
    ),
  };
}

interface ReadDescendantsParams extends BaseParams {
  id: string;
}

export async function readDescendants({ id, scopedClusterClient }: ReadDescendantsParams) {
  const response = await scopedClusterClient.asInternalUser.search<WiredStreamDefinition>({
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
  return response.hits.hits.map((hit) => hit._source as WiredStreamDefinition);
}

export async function validateAncestorFields(
  scopedClusterClient: IScopedClusterClient,
  id: string,
  fields: FieldDefinition
) {
  const { ancestors } = await readAncestors({
    id,
    scopedClusterClient,
  });
  for (const ancestor of ancestors) {
    for (const name in fields) {
      if (
        Object.hasOwn(fields, name) &&
        isWiredStream(ancestor) &&
        Object.entries(ancestor.stream.wired.fields).some(
          ([ancestorFieldName, attr]) =>
            attr.type !== fields[name].type && ancestorFieldName === name
        )
      ) {
        throw new MalformedFields(
          `Field ${name} is already defined with incompatible type in the parent stream ${ancestor.name}`
        );
      }
    }
  }
}

export async function validateDescendantFields(
  scopedClusterClient: IScopedClusterClient,
  id: string,
  fields: FieldDefinition
) {
  const descendants = await readDescendants({
    id,
    scopedClusterClient,
  });
  for (const descendant of descendants) {
    for (const name in fields) {
      if (
        Object.hasOwn(fields, name) &&
        Object.entries(descendant.stream.wired.fields).some(
          ([descendantFieldName, attr]) =>
            attr.type !== fields[name].type && descendantFieldName === name
        )
      ) {
        throw new MalformedFields(
          `Field ${name} is already defined with incompatible type in the child stream ${descendant.name}`
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
  if (!isWiredStream(definition)) {
    // TODO For now, we just don't allow reads at all - later on we will relax this to allow certain operations, but they will use a completely different syncing logic
    throw new Error('Cannot sync an unmanaged stream');
  }
  const componentTemplate = generateLayer(definition.name, definition);
  await upsertComponent({
    esClient: scopedClusterClient.asCurrentUser,
    logger,
    component: componentTemplate,
  });
  await upsertIngestPipeline({
    esClient: scopedClusterClient.asCurrentUser,
    logger,
    pipeline: generateIngestPipeline(definition.name, definition),
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
    template: generateIndexTemplate(definition.name),
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
    name: definition.name,
  });
  await upsertInternalStream({
    scopedClusterClient,
    definition,
  });
  await rolloverDataStreamIfNecessary({
    esClient: scopedClusterClient.asCurrentUser,
    name: definition.name,
    logger,
    mappings: componentTemplate.template.mappings?.properties,
  });
}

export async function streamsEnabled({ scopedClusterClient }: BaseParams) {
  return await scopedClusterClient.asInternalUser.indices.exists({
    index: STREAMS_INDEX,
  });
}
