/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from 'src/core/server';
import { ALERT_HISTORY_PREFIX } from '../../../common';
import mappings from './mappings.json';

export function getAlertHistoryIndexTemplate() {
  return {
    index_patterns: [`${ALERT_HISTORY_PREFIX}*`],
    _meta: {
      description:
        'System generated mapping for preconfigured alert history Elasticsearch index connector.',
    },
    template: {
      settings: {
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
      },
      mappings,
    },
  };
}

async function doesIndexTemplateExist({
  client,
  templateName,
}: {
  client: ElasticsearchClient;
  templateName: string;
}) {
  try {
    return await client.indices.existsIndexTemplate({ name: templateName });
  } catch (err) {
    throw new Error(`error checking existence of index template: ${err.message}`);
  }
}

async function createIndexTemplate({
  client,
  template,
  templateName,
}: {
  client: ElasticsearchClient;
  template: Record<string, unknown>;
  templateName: string;
}) {
  try {
    await client.indices.putIndexTemplate({
      name: templateName,
      body: template,
      create: true,
    });
  } catch (err) {
    // The error message doesn't have a type attribute we can look to guarantee it's due
    // to the template already existing (only long message) so we'll check ourselves to see
    // if the template now exists. This scenario would happen if you startup multiple Kibana
    // instances at the same time.
    const existsNow = await doesIndexTemplateExist({ client, templateName });
    if (!existsNow) {
      throw new Error(`error creating index template: ${err.message}`);
    }
  }
}

async function createIndexTemplateIfNotExists({
  client,
  template,
  templateName,
}: {
  client: ElasticsearchClient;
  template: Record<string, unknown>;
  templateName: string;
}) {
  const indexTemplateExists = await doesIndexTemplateExist({ client, templateName });

  if (!indexTemplateExists) {
    await createIndexTemplate({ client, template, templateName });
  }
}

export async function createAlertHistoryIndexTemplate({
  client,
  logger,
}: {
  client: ElasticsearchClient;
  logger: Logger;
}) {
  try {
    const indexTemplate = getAlertHistoryIndexTemplate();
    await createIndexTemplateIfNotExists({
      client,
      templateName: `${ALERT_HISTORY_PREFIX}template`,
      template: indexTemplate,
    });
  } catch (err) {
    logger.error(`Could not initialize alert history index with mappings: ${err.message}.`);
  }
}
