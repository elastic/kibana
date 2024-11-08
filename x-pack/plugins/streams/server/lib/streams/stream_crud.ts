/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { get } from 'lodash';
import { Logger } from '@kbn/logging';
import { StreamDefinition } from '../../../common/types';
import { STREAMS_INDEX } from '../../../common/constants';
import { DefinitionNotFound, IndexTemplateNotFound } from './errors';
import {
  deleteTemplate,
  upsertComponent,
  upsertIngestPipeline,
  upsertTemplate,
} from '../../templates/manage_index_templates';
import { generateLayer } from './component_templates/generate_layer';
import { generateIngestPipeline } from './ingest_pipelines/generate_ingest_pipeline';
import { generateReroutePipeline } from './ingest_pipelines/generate_reroute_pipeline';
import { generateIndexTemplate } from './index_templates/generate_index_template';
import { deleteComponent } from './component_templates/manage_component_templates';
import { deleteIngestPipeline } from './ingest_pipelines/manage_ingest_pipelines';
import { getIndexTemplateName } from './index_templates/name';
import { getComponentTemplateName } from './component_templates/name';
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
  await scopedClusterClient.asCurrentUser.delete({
    id,
    index: STREAMS_INDEX,
    refresh: 'wait_for',
  });
  await deleteTemplate({
    esClient: scopedClusterClient.asSecondaryAuthUser,
    name: getIndexTemplateName(id),
    logger,
  });
  await deleteComponent({
    esClient: scopedClusterClient.asSecondaryAuthUser,
    name: getComponentTemplateName(id),
    logger,
  });
  await deleteIngestPipeline({
    esClient: scopedClusterClient.asSecondaryAuthUser,
    id: getProcessingPipelineName(id),
    logger,
  });
  await deleteIngestPipeline({
    esClient: scopedClusterClient.asSecondaryAuthUser,
    id: getReroutePipelineName(id),
    logger,
  });
}

async function upsertStream({ definition, scopedClusterClient }: BaseParamsWithDefinition) {
  return scopedClusterClient.asCurrentUser.index({
    id: definition.id,
    index: STREAMS_INDEX,
    document: definition,
    refresh: 'wait_for',
  });
}

type ListStreamsParams = BaseParams;

export async function listStreams({ scopedClusterClient }: ListStreamsParams) {
  const response = await scopedClusterClient.asCurrentUser.search<StreamDefinition>({
    index: STREAMS_INDEX,
    size: 10000,
    fields: ['id'],
    _source: false,
  });
  const definitions = response.hits.hits.map((hit) => hit.fields as { id: string[] });
  return definitions;
}

interface ReadStreamParams extends BaseParams {
  id: string;
}

export async function readStream({ id, scopedClusterClient }: ReadStreamParams) {
  try {
    const response = await scopedClusterClient.asCurrentUser.get<StreamDefinition>({
      id,
      index: STREAMS_INDEX,
    });
    const definition = response._source as StreamDefinition;
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

export async function readIndexTemplate({
  scopedClusterClient,
  definition,
}: BaseParamsWithDefinition) {
  const response = await scopedClusterClient.asSecondaryAuthUser.indices.getIndexTemplate({
    name: `${definition.id}@stream`,
  });
  const indexTemplate = response.index_templates.find(
    (doc) => doc.name === `${definition.id}@stream`
  );
  if (!indexTemplate) {
    throw new IndexTemplateNotFound(`Unable to find index_template for ${definition.id}`);
  }
  return indexTemplate;
}

export async function getIndexTemplateComponents({
  scopedClusterClient,
  definition,
}: BaseParamsWithDefinition) {
  const indexTemplate = await readIndexTemplate({ scopedClusterClient, definition });
  return {
    composedOf: indexTemplate.index_template.composed_of,
    ignoreMissing: get(
      indexTemplate,
      'index_template.ignore_missing_component_templates',
      []
    ) as string[],
  };
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
  await upsertStream({
    scopedClusterClient,
    definition,
  });
  await upsertComponent({
    esClient: scopedClusterClient.asSecondaryAuthUser,
    logger,
    component: generateLayer(definition.id, definition),
  });
  await upsertIngestPipeline({
    esClient: scopedClusterClient.asSecondaryAuthUser,
    logger,
    pipeline: generateIngestPipeline(definition.id, definition),
  });
  const reroutePipeline = await generateReroutePipeline({
    definition,
  });
  await upsertIngestPipeline({
    esClient: scopedClusterClient.asSecondaryAuthUser,
    logger,
    pipeline: reroutePipeline,
  });
  if (rootDefinition) {
    const { composedOf, ignoreMissing } = await getIndexTemplateComponents({
      scopedClusterClient,
      definition: rootDefinition,
    });
    const parentReroutePipeline = await generateReroutePipeline({
      definition: rootDefinition,
    });
    await upsertIngestPipeline({
      esClient: scopedClusterClient.asSecondaryAuthUser,
      logger,
      pipeline: parentReroutePipeline,
    });
    await upsertTemplate({
      esClient: scopedClusterClient.asSecondaryAuthUser,
      logger,
      template: generateIndexTemplate(definition.id, composedOf, ignoreMissing),
    });
  } else {
    await upsertTemplate({
      esClient: scopedClusterClient.asSecondaryAuthUser,
      logger,
      template: generateIndexTemplate(definition.id),
    });
  }
}
