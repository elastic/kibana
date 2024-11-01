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
import { logsLayer } from './component_templates/logs_layer';
import { logsDefaultPipeline } from './ingest_pipelines/logs_default_pipeline';
import { logsIndexTemplate } from './index_templates/logs';
import { logsJsonPipeline } from './ingest_pipelines/logs_json_pipeline';

interface BootstrapRootEntityParams {
  esClient: ElasticsearchClient;
  logger: Logger;
}

export async function bootstrapRootEntity({ esClient, logger }: BootstrapRootEntityParams) {
  await upsertComponent({ esClient, logger, component: logsLayer });
  await upsertIngestPipeline({ esClient, logger, pipeline: logsJsonPipeline });
  await upsertIngestPipeline({ esClient, logger, pipeline: logsDefaultPipeline });
  await upsertTemplate({ esClient, logger, template: logsIndexTemplate });
}
