/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Config } from '../types';
import { templates } from '../data_sources';

export async function installTemplate({
  client,
  config,
  logger,
}: {
  config: Config;
  logger: Logger;
  client: ElasticsearchClient;
}): Promise<any> {
  const namespace = config.indexing.dataset;
  const template = templates[config.indexing.dataset] || templates.fake_logs;

  if (isArray(template) && template.length !== 0) {
    const templateNames = template.map((templateDef) => templateDef.namespace).join(',');

    logger.info(`Installing templates (${templateNames})`);

    return Promise.all(
      template.map((templateDef) => {
        const templateNamespace = `${namespace}.${templateDef.namespace}`;
        return client.indices
          .putTemplate({
            name: `high-cardinality-data-${templateNamespace}`,
            body: templateDef.template,
          })
          .catch((error) => {
            logger.error(`Failed to install template (${templateNamespace}): ${error.message}`);
          });
      })
    );
  }

  if (template && !isArray(template)) {
    logger.info('Installing template');
    return client.indices
      .putTemplate({ name: `high-cardinality-data-${namespace}`, body: template })
      .catch((error) => {
        logger.error(
          `Failed to install template (high-cardinality-data-${namespace}): ${error.message}`
        );
      });
  }
}
