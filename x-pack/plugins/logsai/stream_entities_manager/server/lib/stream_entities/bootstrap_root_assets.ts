/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import {
  upsertComponent,
  upsertIngestPipeline,
  upsertTemplate,
} from '../../templates/manage_index_templates';
import { logsAllLayer } from './component_templates/logs_all_layer';
import { logsAllDefaultPipeline } from './ingest_pipelines/logs_all_default_pipeline';
import { logsAllIndexTemplate } from './index_templates/logs_all';

interface BootstrapRootEntityParams {
  esClient: ElasticsearchClient;
  logger: Logger;
}

export async function bootstrapRootEntity({ esClient, logger }: BootstrapRootEntityParams) {
  await upsertComponent({ esClient, logger, component: logsAllLayer });
  await upsertIngestPipeline({ esClient, logger, pipeline: logsAllDefaultPipeline });
  await upsertTemplate({ esClient, logger, template: logsAllIndexTemplate });
}
