/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ObservabilityElasticsearchClient,
  createObservabilityEsClient,
} from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { APM_SERVER_FEATURE_ID } from '../../../common/rules/apm_rule_types';
import type { MinimalAPMRouteHandlerResources } from '../../routes/apm_routes/register_apm_server_routes';

export interface EsClient extends ObservabilityElasticsearchClient {
  indices: APMIndices;
}

export async function getEsClient({
  context,
  logger,
  getApmIndices,
}: Pick<
  MinimalAPMRouteHandlerResources,
  'context' | 'getApmIndices' | 'logger'
>): Promise<EsClient> {
  const [coreContext, indices] = await Promise.all([context.core, getApmIndices()]);

  return {
    indices,
    ...createObservabilityEsClient({
      client: coreContext.elasticsearch.client.asCurrentUser,
      logger,
      plugin: `@kbn/${APM_SERVER_FEATURE_ID}-plugin`,
    }),
  };
}
