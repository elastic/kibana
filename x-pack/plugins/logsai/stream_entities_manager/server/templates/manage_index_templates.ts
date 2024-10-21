/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
  IngestPutPipelineRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BaseComponentTemplateConfig } from './components/base';
import { retryTransientEsErrors } from '../lib/api/helpers/retry';
import { streamEntitieIndexTemplate } from './stream_entities_template';

interface TemplateManagementOptions {
  esClient: ElasticsearchClient;
  template: IndicesPutIndexTemplateRequest;
  logger: Logger;
}

interface PipelineManagementOptions {
  esClient: ElasticsearchClient;
  pipeline: IngestPutPipelineRequest;
  logger: Logger;
}

interface ComponentManagementOptions {
  esClient: ElasticsearchClient;
  component: ClusterPutComponentTemplateRequest;
  logger: Logger;
}

export const installStreamEntitiesManagerTemplates = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}) => {
  await upsertComponent({
    esClient,
    logger,
    component: BaseComponentTemplateConfig,
  });
  await upsertTemplate({
    esClient,
    logger,
    template: streamEntitieIndexTemplate,
  });
};

interface DeleteTemplateOptions {
  esClient: ElasticsearchClient;
  name: string;
  logger: Logger;
}

export async function upsertTemplate({ esClient, template, logger }: TemplateManagementOptions) {
  try {
    await retryTransientEsErrors(() => esClient.indices.putIndexTemplate(template), { logger });
    logger.debug(() => `Installed index template: ${JSON.stringify(template)}`);
  } catch (error: any) {
    logger.error(`Error updating index template: ${error.message}`);
    throw error;
  }
}

export async function upsertIngestPipeline({
  esClient,
  pipeline,
  logger,
}: PipelineManagementOptions) {
  try {
    await retryTransientEsErrors(() => esClient.ingest.putPipeline(pipeline), { logger });
    logger.debug(() => `Installed index template: ${JSON.stringify(pipeline)}`);
  } catch (error: any) {
    logger.error(`Error updating index template: ${error.message}`);
    throw error;
  }
}

export async function deleteTemplate({ esClient, name, logger }: DeleteTemplateOptions) {
  try {
    await retryTransientEsErrors(
      () => esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] }),
      { logger }
    );
  } catch (error: any) {
    logger.error(`Error deleting index template: ${error.message}`);
    throw error;
  }
}

export async function upsertComponent({ esClient, component, logger }: ComponentManagementOptions) {
  try {
    await retryTransientEsErrors(() => esClient.cluster.putComponentTemplate(component), {
      logger,
    });
    logger.debug(() => `Installed component template: ${JSON.stringify(component)}`);
  } catch (error: any) {
    logger.error(`Error updating component template: ${error.message}`);
    throw error;
  }
}
