/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { IndicesDataStream, IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { set } from '@kbn/safer-lodash-set';
import { STREAMS_INDEX } from '../../../common/constants';
import {
  FieldDefinition,
  StreamDefinition,
  UnmanagedElasticsearchAsset,
} from '../../../common/types';
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
import {
  generateClassicIngestPipelineBody,
  generateIngestPipeline,
} from './ingest_pipelines/generate_ingest_pipeline';
import { generateReroutePipeline } from './ingest_pipelines/generate_reroute_pipeline';
import {
  deleteIngestPipeline,
  upsertIngestPipeline,
} from './ingest_pipelines/manage_ingest_pipelines';
import {
  getClassicPipelineName,
  getProcessingPipelineName,
  getReroutePipelineName,
} from './ingest_pipelines/name';

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

export async function deleteUnmanagedStreamObjects({
  id,
  scopedClusterClient,
  logger,
}: DeleteStreamParams) {
  await deleteDataStream({
    esClient: scopedClusterClient.asCurrentUser,
    name: id,
    logger,
  });
  try {
    await deleteIngestPipeline({
      esClient: scopedClusterClient.asCurrentUser,
      id: getClassicPipelineName(id),
      logger,
    });
  } catch (e) {
    // if the pipeline doesn't exist, we don't need to delete it
    if (!(e.meta?.statusCode === 404)) {
      throw e;
    }
  }
  try {
    await scopedClusterClient.asInternalUser.get({
      id,
      index: STREAMS_INDEX,
    });
    await scopedClusterClient.asInternalUser.delete({
      id,
      index: STREAMS_INDEX,
      refresh: 'wait_for',
    });
  } catch (e) {
    if (e.meta?.statusCode !== 404) {
      throw e;
    }
  }
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
    document: { ...definition },
    refresh: 'wait_for',
  });
}

type ListStreamsParams = BaseParams;

export interface ListStreamResponse {
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
  let definitions = response.hits.hits.map((hit) => ({ ...hit._source! }));
  const hasAccess = await Promise.all(
    definitions.map((definition) => checkReadAccess({ id: definition.id, scopedClusterClient }))
  );
  definitions = definitions.filter((_, index) => hasAccess[index]);
  const definitionMap = new Map(definitions.map((definition) => [definition.id, definition]));
  dataStreams.forEach((dataStream) => {
    if (!definitionMap.has(dataStream.id)) {
      definitionMap.set(dataStream.id, dataStream);
    }
  });

  return {
    definitions: Array.from(definitionMap.values()),
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
  if (response.data_streams.length !== 1) {
    throw new DefinitionNotFound(`Stream definition for ${id} not found.`);
  }
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

  definition.unmanaged_elasticsearch_assets = await getUnmanagedElasticsearchAssets({
    dataStream: response.data_streams[0],
    scopedClusterClient,
  });

  return { definition };
}

interface ReadUnmanagedAssetsParams extends BaseParams {
  dataStream: IndicesDataStream;
}

async function getUnmanagedElasticsearchAssets({
  dataStream,
  scopedClusterClient,
}: ReadUnmanagedAssetsParams): Promise<UnmanagedElasticsearchAsset[]> {
  const componentTemplates: string[] = [];
  const template = await scopedClusterClient.asCurrentUser.indices.getIndexTemplate({
    name: dataStream.template,
  });
  if (template.index_templates.length) {
    template.index_templates[0].index_template.composed_of.forEach((componentTemplateName) => {
      componentTemplates.push(componentTemplateName);
    });
  }
  const writeIndexName = dataStream.indices.at(-1)?.index_name!;
  const currentIndex = await scopedClusterClient.asCurrentUser.indices.get({
    index: writeIndexName,
  });
  const ingestPipelineId = currentIndex[writeIndexName].settings?.index?.default_pipeline!;
  return [
    ...(ingestPipelineId
      ? [
          {
            type: 'ingest_pipeline' as const,
            id: ingestPipelineId,
          },
        ]
      : []),
    ...componentTemplates.map((componentTemplateName) => ({
      type: 'component_template' as const,
      id: componentTemplateName,
    })),
    {
      type: 'index_template',
      id: dataStream.template,
    },
    {
      type: 'data_stream',
      id: dataStream.name,
    },
  ];
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
      ancestorIds.map((ancestorId) =>
        readStream({ scopedClusterClient, id: ancestorId, skipAccessCheck: true })
      )
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
  if (!definition.managed) {
    await syncUnmanagedStream({ scopedClusterClient, definition, logger });
    await upsertInternalStream({
      scopedClusterClient,
      definition,
    });
    return;
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
  await rolloverDataStreamIfNecessary({
    esClient: scopedClusterClient.asCurrentUser,
    name: definition.id,
    logger,
    mappings: componentTemplate.template.mappings?.properties,
  });
}

interface ExecutionPlanStep {
  method: string;
  path: string;
  body?: Record<string, unknown>;
}

async function syncUnmanagedStream({ scopedClusterClient, definition, logger }: SyncStreamParams) {
  if (definition.managed) {
    throw new Error('Got an unmanaged stream that is marked as managed');
  }
  if (definition.fields.length) {
    throw new Error(
      'Unmanaged streams cannot have managed fields, please edit the component templates directly'
    );
  }
  if (definition.children.length) {
    throw new Error('Unmanaged streams cannot have managed children, coming soon');
  }
  const response = await scopedClusterClient.asCurrentUser.indices.getDataStream({
    name: definition.id,
  });
  if (response.data_streams.length !== 1) {
    throw new Error('Data stream not found');
  }
  const dataStream = response.data_streams[0];
  const unmanagedAssets = await getUnmanagedElasticsearchAssets({
    dataStream,
    scopedClusterClient,
  });
  const executionPlan: ExecutionPlanStep[] = [];
  const streamManagedPipelineName = getClassicPipelineName(definition.id);
  const pipelineName = unmanagedAssets.find((asset) => asset.type === 'ingest_pipeline')?.id;
  if (!pipelineName) {
    throw new Error('Unmanaged stream needs a default ingest pipeline');
  }
  if (pipelineName === streamManagedPipelineName) {
    throw new Error('Unmanaged stream cannot have the @stream pipeline as the default pipeline');
  }
  await findStreamManagedPipelineReferenceAddOrCheckNestedCustomPipeline(
    scopedClusterClient,
    pipelineName,
    definition,
    executionPlan
  );

  if (definition.processing.length) {
    // if the stream has processing, we need to create or update the stream managed pipeline
    executionPlan.push({
      method: 'PUT',
      path: `/_ingest/pipeline/${streamManagedPipelineName}`,
      body: generateClassicIngestPipelineBody(definition),
    });
  } else {
    const pipelineExists = Boolean(
      await tryGettingPipeline({ scopedClusterClient, id: streamManagedPipelineName })
    );
    // no processing, just delete the pipeline if it exists. The reference to the pipeline won't break anything
    if (pipelineExists) {
      executionPlan.push({
        method: 'DELETE',
        path: `/_ingest/pipeline/${streamManagedPipelineName}`,
      });
    }
  }

  for (const step of executionPlan) {
    await scopedClusterClient.asCurrentUser.transport.request({
      method: step.method,
      path: step.path,
      body: step.body,
    });
  }
}

async function findStreamManagedPipelineReferenceAddOrCheckNestedCustomPipeline(
  scopedClusterClient: IScopedClusterClient,
  pipelineName: string,
  definition: StreamDefinition,
  executionPlan: ExecutionPlanStep[]
) {
  const streamManagedPipelineName = getClassicPipelineName(definition.id);
  const pipeline = (await tryGettingPipeline({ scopedClusterClient, id: pipelineName })) || {
    processors: [],
  };
  const streamProcessor = pipeline.processors?.find(
    (processor) => processor.pipeline && processor.pipeline.name === streamManagedPipelineName
  );
  const customProcessor = pipeline.processors?.findLast(
    (processor) => processor.pipeline && processor.pipeline.name.endsWith('@custom')
  );
  if (streamProcessor) {
    return;
  }
  if (customProcessor) {
    // go one level deeper, find the latest @custom leaf pipeline
    await findStreamManagedPipelineReferenceAddOrCheckNestedCustomPipeline(
      scopedClusterClient,
      customProcessor.pipeline!.name,
      definition,
      executionPlan
    );
    return;
  }
  const callStreamManagedPipelineProcessor: IngestProcessorContainer = {
    pipeline: {
      name: streamManagedPipelineName,
      if: `ctx._index == '${definition.id}'`,
      ignore_missing_pipeline: true,
    },
  };
  executionPlan.push({
    method: 'PUT',
    path: `/_ingest/pipeline/${pipelineName}`,
    body: set(
      { ...pipeline },
      'processors',
      pipeline.processors!.concat(callStreamManagedPipelineProcessor)
    ),
  });
}

async function tryGettingPipeline({ scopedClusterClient, id }: ReadStreamParams) {
  try {
    return (await scopedClusterClient.asCurrentUser.ingest.getPipeline({ id }))[id];
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      return;
    }
    throw e;
  }
}

export async function streamsEnabled({ scopedClusterClient }: BaseParams) {
  return await scopedClusterClient.asInternalUser.indices.exists({
    index: STREAMS_INDEX,
  });
}
