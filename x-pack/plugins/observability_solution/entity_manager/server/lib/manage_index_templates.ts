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
import { entitiesHistoryBaseComponentTemplateConfig } from '../templates/components/base_history';
import { entitiesLatestBaseComponentTemplateConfig } from '../templates/components/base_latest';
import { entitiesEntityComponentTemplateConfig } from '../templates/components/entity';
import { entitiesEventComponentTemplateConfig } from '../templates/components/event';
import { entitiesHistoryIndexTemplateConfig } from '../templates/entities_history_template';
import { entitiesLatestIndexTemplateConfig } from '../templates/entities_latest_template';

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

export const installEntityManagerTemplates = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}) => {
  await Promise.all([
    upsertComponent({
      esClient,
      logger,
      component: entitiesHistoryBaseComponentTemplateConfig,
    }),
    upsertComponent({
      esClient,
      logger,
      component: entitiesLatestBaseComponentTemplateConfig,
    }),
    upsertComponent({
      esClient,
      logger,
      component: entitiesEventComponentTemplateConfig,
    }),
    upsertComponent({
      esClient,
      logger,
      component: entitiesEntityComponentTemplateConfig,
    }),
  ]);

  await Promise.all([
    upsertTemplate({
      esClient,
      logger,
      template: entitiesHistoryIndexTemplateConfig,
    }),
    upsertTemplate({
      esClient,
      logger,
      template: entitiesLatestIndexTemplateConfig,
    }),
  ]);
};

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
  logger.debug(() => `Entity manager index template: ${JSON.stringify(template)}`);
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
  logger.debug(() => `Entity manager component template: ${JSON.stringify(component)}`);
}
