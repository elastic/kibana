/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pRetry from 'p-retry';
import { Logger, ElasticsearchClient } from '@kbn/core/server';
import { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export async function createOrUpdateIndexTemplate({
  indexTemplate,
  client,
  logger,
}: {
  indexTemplate: IndicesPutIndexTemplateRequest;
  client: ElasticsearchClient;
  logger: Logger;
}) {
  try {
    /*
     * In some cases we could be trying to create the index template before ES is ready.
     * When this happens, we retry creating the template with exponential backoff.
     * We use retry's default formula, meaning that the first retry happens after 2s,
     * the 5th after 32s, and the final attempt after around 17m. If the final attempt fails,
     * the error is logged to the console.
     * See https://github.com/sindresorhus/p-retry and https://github.com/tim-kos/node-retry.
     */
    return await pRetry(
      async () => {
        logger.debug(
          `Create index template: "${indexTemplate.name}" for index pattern "${indexTemplate.body?.index_patterns}"`
        );

        const result = await client.indices.putIndexTemplate(indexTemplate);

        if (!result.acknowledged) {
          // @ts-expect-error
          const resultError = JSON.stringify(result?.body?.error);
          throw new Error(resultError);
        }

        return result;
      },
      {
        onFailedAttempt: (e) => {
          logger.warn(`Could not create index template: '${indexTemplate.name}'. Retrying...`);
          logger.warn(e);
        },
      }
    );
  } catch (e) {
    logger.error(`Could not create index template: '${indexTemplate.name}'. Error: ${e.message}.`);
  }
}
