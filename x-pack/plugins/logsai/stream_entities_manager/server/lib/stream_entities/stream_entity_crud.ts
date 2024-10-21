/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { get } from 'lodash';
import { StreamEntityDefinition } from '../../../common/types';
import { STREAM_ENTITIES_INDEX } from '../../../common/constants';
import { ComponentTemplateNotFound, DefinitionNotFound } from '../api/errors';
import { IndexTemplateNotFound } from '../api/errors/index_template_not_found';

interface BaseParams {
  scopedClusterClient: IScopedClusterClient;
}

interface BaseParamsWithDefinition extends BaseParams {
  definition: StreamEntityDefinition;
}

export async function createStreamEntity({
  definition,
  scopedClusterClient,
}: BaseParamsWithDefinition) {
  return scopedClusterClient.asCurrentUser.index({
    id: definition.id,
    index: STREAM_ENTITIES_INDEX,
    document: definition,
    refresh: 'wait_for',
  });
}

interface ReadStreamEntityParams extends BaseParams {
  id: string;
}

export async function readStreamEntity({ id, scopedClusterClient }: ReadStreamEntityParams) {
  const response = await scopedClusterClient.asCurrentUser.get<StreamEntityDefinition>({
    id,
    index: STREAM_ENTITIES_INDEX,
  });
  if (!response.found) {
    throw new DefinitionNotFound(`Stream Entity definition for ${id} not found.`);
  }
  const definition = response._source;
  const indexTemplate = await readIndexTemplate({ scopedClusterClient, definition });
  const componentTemplate = await readComponentTemplate({ scopedClusterClient, definition });
  const ingestPipelines = await readIngestPipelines({ scopedClusterClient, definition });
  return {
    definition,
    index_template: indexTemplate,
    component_template: componentTemplate,
    ingest_pipelines: ingestPipelines,
  };
}

export async function readIndexTemplate({
  scopedClusterClient,
  definition,
}: BaseParamsWithDefinition) {
  const response = await scopedClusterClient.asSecondaryAuthUser.indices.getIndexTemplate({
    name: definition.id,
  });
  const indexTemplate = response.index_templates.find((doc) => doc.name === definition.id);
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
    name: `${definition.id}@layer`,
  });
  const componentTemplate = response.component_templates.find(
    (doc) => doc.name === `${definition.id}@layer`
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
    id: `${definition.id}*`,
  });

  return response;
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
