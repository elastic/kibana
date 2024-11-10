/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@kbn/es-types';
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { get } from 'lodash';
import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { STREAMS_INDEX } from '../../../common/constants';
import { StreamDefinition } from '../../../common/types';
import { ComponentTemplateNotFound, DefinitionNotFound, IndexTemplateNotFound } from './errors';

interface BaseParams {
  scopedClusterClient: IScopedClusterClient;
  logger: Logger;
}

interface BaseParamsWithDefinition extends BaseParams {
  definition: StreamDefinition;
}

export async function createStream({ definition, scopedClusterClient }: BaseParamsWithDefinition) {
  return scopedClusterClient.asCurrentUser.index({
    id: definition.id,
    index: STREAMS_INDEX,
    document: definition,
    refresh: 'wait_for',
  });
}

interface ReadStreamParams extends BaseParams {
  id: string;
}

export async function readStream({ id, ...baseParams }: ReadStreamParams) {
  const { scopedClusterClient } = baseParams;
  try {
    const response = await scopedClusterClient.asCurrentUser.get<StreamDefinition>({
      id,
      index: STREAMS_INDEX,
    });
    const definition = response._source as StreamDefinition;
    const indexTemplate = await readIndexTemplate({ ...baseParams, definition });
    const componentTemplate = await readComponentTemplate({ ...baseParams, definition });
    const ingestPipelines = await readIngestPipelines({ ...baseParams, definition });
    return {
      definition,
      index_template: indexTemplate,
      component_template: componentTemplate,
      ingest_pipelines: ingestPipelines,
    };
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      throw new DefinitionNotFound(`Stream definition for ${id} not found.`);
    }
    throw e;
  }
}

type ListStreamsParams = BaseParams;

export interface ListStreamResponse {
  hits: Array<SearchHit<StreamDefinition>>;
  total: {
    value: number;
  };
}

export async function listStreams({
  scopedClusterClient,
  logger,
}: ListStreamsParams): Promise<ListStreamResponse> {
  const esClient = createObservabilityEsClient({
    client: scopedClusterClient.asCurrentUser,
    logger,
    plugin: 'streams',
  });

  const response = await esClient.search<StreamDefinition>('list_streams', {
    index: STREAMS_INDEX,
    allow_no_indices: true,
    track_total_hits: true,
    size: 10_000,
  });

  return {
    hits: response.hits.hits,
    total: response.hits.total,
  };
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

export async function readComponentTemplate({
  scopedClusterClient,
  definition,
}: BaseParamsWithDefinition) {
  const response = await scopedClusterClient.asSecondaryAuthUser.cluster.getComponentTemplate({
    name: `${definition.id}@stream.layer`,
  });
  const componentTemplate = response.component_templates.find(
    (doc) => doc.name === `${definition.id}@stream.layer`
  );
  if (!componentTemplate) {
    throw new ComponentTemplateNotFound(`Unable to find component_template for ${definition.id}`);
  }
  return componentTemplate;
}

export async function readIngestPipelines({
  scopedClusterClient,
  definition,
}: BaseParamsWithDefinition) {
  const response = await scopedClusterClient.asSecondaryAuthUser.ingest.getPipeline({
    id: `${definition.id}@stream.*`,
  });

  return response;
}

export async function getIndexTemplateComponents(params: BaseParamsWithDefinition) {
  const indexTemplate = await readIndexTemplate(params);
  return {
    composedOf: indexTemplate.index_template.composed_of,
    ignoreMissing: get(
      indexTemplate,
      'index_template.ignore_missing_component_templates',
      []
    ) as string[],
  };
}
