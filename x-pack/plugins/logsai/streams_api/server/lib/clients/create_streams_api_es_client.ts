/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { StreamsAPIRouteHandlerResources } from '../../routes/types';

export async function createStreamsAPIEsClient({
  context,
  logger,
}: Pick<StreamsAPIRouteHandlerResources, 'context' | 'logger'>) {
  const esClient = createObservabilityEsClient({
    client: (await context.core).elasticsearch.client.asCurrentUser,
    logger,
    plugin: 'streamsApi',
  });

  return esClient;
}
