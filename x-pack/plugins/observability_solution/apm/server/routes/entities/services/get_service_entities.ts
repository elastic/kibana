/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import { Logger } from '@kbn/core/server';
import { WrappedElasticsearchClientError } from '@kbn/observability-plugin/server';
import { EntitiesESClient } from '../../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getEntities } from '../get_entities';
import { calculateAvgMetrics } from '../utils/calculate_avg_metrics';
import { mergeEntities } from '../utils/merge_entities';

export const MAX_NUMBER_OF_SERVICES = 1_000;

export async function getServiceEntities({
  entitiesESClient,
  start,
  end,
  kuery,
  environment,
  logger,
}: {
  entitiesESClient: EntitiesESClient;
  start: number;
  end: number;
  kuery: string;
  environment: string;
  logger: Logger;
}) {
  return withApmSpan('get_service_entities', async () => {
    try {
      const entities = await getEntities({
        entitiesESClient,
        start,
        end,
        kuery,
        environment,
        size: MAX_NUMBER_OF_SERVICES,
      });

      return calculateAvgMetrics(mergeEntities({ entities }));
    } catch (error) {
      // If the index does not exist, handle it gracefully
      if (
        error instanceof WrappedElasticsearchClientError &&
        error.originalError instanceof errors.ResponseError
      ) {
        const type = error.originalError.body.error.type;

        if (type === 'index_not_found_exception') {
          logger.error(`Entities index does not exist. Unable to fetch services.`);
          return [];
        }
      }

      throw error;
    }
  });
}
