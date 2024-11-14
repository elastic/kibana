/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { retryTransientEsErrors } from '../helpers/retry';

interface DeleteComponentOptions {
  esClient: ElasticsearchClient;
  name: string;
  logger: Logger;
}

interface ComponentManagementOptions {
  esClient: ElasticsearchClient;
  component: ClusterPutComponentTemplateRequest;
  logger: Logger;
}

export async function deleteComponent({ esClient, name, logger }: DeleteComponentOptions) {
  try {
    await retryTransientEsErrors(
      () => esClient.cluster.deleteComponentTemplate({ name }, { ignore: [404] }),
      { logger }
    );
  } catch (error: any) {
    logger.error(`Error deleting component template: ${error.message}`);
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
