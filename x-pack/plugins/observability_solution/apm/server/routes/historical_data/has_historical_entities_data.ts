/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { WrappedElasticsearchClientError } from '@kbn/observability-plugin/server';
import { Logger } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import { EntitiesESClient } from '../../lib/helpers/create_es_client/create_entities_es_client/create_entities_es_client';

export async function hasEntitiesData(entitiesESClient: EntitiesESClient, logger: Logger) {
  const params = {
    body: {
      terminate_after: 1,
      track_total_hits: true,
      size: 0,
    },
  };

  try {
    const resp = await entitiesESClient.searchLatest('has_historical_entities_data', params);
    return resp.hits.total.value > 0;
  } catch (error) {
    if (
      error instanceof WrappedElasticsearchClientError &&
      error.originalError instanceof errors.ResponseError
    ) {
      const type = error.originalError.body.error.type;

      logger.error(type);

      return false;
    }
    return false;
  }
}
