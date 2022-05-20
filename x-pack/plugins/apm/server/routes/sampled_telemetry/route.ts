/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { SavedServiceGroup } from '../../../common/service_groups';
import { createOrUpdateIndex } from '@kbn/observability-plugin/server';
import { getDataTelemetry } from '../../lib/apm_telemetry';

export const sampledTelemetryRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/upload-sample-telemetry',
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{ serviceGroups: SavedServiceGroup[] }> => {
    const { context, logger, config } = resources;
    const core = await context.core;
    const esClient = core.elasticsearch.client;

    const savedObjectsClient = core.savedObjects.client;
    const internalClient = esClient.asInternalUser;
    const currentUserClient = esClient.asCurrentUser;

    const index = 'apm-sample-telemetry';

    const telemetryAttributes = await getDataTelemetry({
      esClient,
      config,
      logger,
      savedObjectsClient,
    });

    const res = await createOrUpdateIndex({
      index,
      client: internalClient,
      logger,
      mappings: { dynamic: true },
    });

    currentUserClient.index({
      index,
      document: telemetryAttributes,
    });

    console.log('create-or-upad', res);

    return telemetryAttributes;
  },
});
