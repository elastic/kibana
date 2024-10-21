/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { StreamEntityDefinition } from '../../../common/types';
import { generateLayer } from './component_templates/generate_layer';
import { generateIngestPipeline } from './ingest_pipelines/generate_ingest_pipeline';
import {
  upsertComponent,
  upsertIngestPipeline,
  upsertTemplate,
} from '../../templates/manage_index_templates';
import { generateIndexTemplate } from './index_templates/generate_index_template';
import { getIndexTemplateComponents } from './stream_entity_crud';
import { generateReroutePipeline } from './ingest_pipelines/generate_reroute_pipeline';

interface BootstrapStreamEntityParams {
  scopedClusterClient: IScopedClusterClient;
  definition: StreamEntityDefinition;
  rootDefinition: StreamEntityDefinition;
  logger: Logger;
}
export async function bootstrapStreamEntity({
  scopedClusterClient,
  definition,
  rootDefinition,
  logger,
}: BootstrapStreamEntityParams) {
  const { composedOf, ignoreMissing } = await getIndexTemplateComponents({
    scopedClusterClient,
    definition: rootDefinition,
  });
  const reroutePipeline = await generateReroutePipeline({
    esClient: scopedClusterClient.asCurrentUser,
    definition: rootDefinition,
  });
  await upsertComponent({
    esClient: scopedClusterClient.asSecondaryAuthUser,
    logger,
    component: generateLayer(definition.id),
  });
  await upsertIngestPipeline({
    esClient: scopedClusterClient.asSecondaryAuthUser,
    logger,
    pipeline: generateIngestPipeline(definition.id),
  });
  await upsertIngestPipeline({
    esClient: scopedClusterClient.asSecondaryAuthUser,
    logger,
    pipeline: reroutePipeline,
  });
  await upsertTemplate({
    esClient: scopedClusterClient.asSecondaryAuthUser,
    logger,
    template: generateIndexTemplate(definition.id, composedOf, ignoreMissing),
  });
}
