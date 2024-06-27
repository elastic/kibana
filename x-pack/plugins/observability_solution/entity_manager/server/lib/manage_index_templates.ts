/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';

interface TemplateManagementOptions {
  esClient: ElasticsearchClient;
  template: IndicesPutIndexTemplateRequest;
  logger: Logger;
}

interface ComponentManagementOptions {
  esClient: ElasticsearchClient;
  component: ClusterPutComponentTemplateRequest;
  logger: Logger;
}

export async function upsertTemplate({ esClient, template, logger }: TemplateManagementOptions) {
  try {
    await esClient.indices.putIndexTemplate(template);
  } catch (error: any) {
    logger.error(`Error updating entity manager index template: ${error.message}`);
    return;
  }

  logger.info(
    `Entity manager index template is up to date (use debug logging to see what was installed)`
  );
  logger.debug(`Entity manager index template: ${JSON.stringify(template)}`);
}

export async function upsertComponent({ esClient, component, logger }: ComponentManagementOptions) {
  try {
    await esClient.cluster.putComponentTemplate(component);
  } catch (error: any) {
    logger.error(`Error updating entity manager component template: ${error.message}`);
    return;
  }

  logger.info(
    `Entity manager component template is up to date (use debug logging to see what was installed)`
  );
  logger.debug(`Entity manager component template: ${JSON.stringify(component)}`);
}
