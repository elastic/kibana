/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { createStandaloneAgentApiKey } from '../../services/api_keys';
import type { FleetRequestHandler, PostStandaloneAgentAPIKeyRequestSchema } from '../../types';
import {
  INDEX_PRIVILEGES,
  canCreateStandaloneAgentApiKey,
} from '../../services/api_keys/create_standalone_agent_api_key';
import { FleetUnauthorizedError, defaultFleetErrorHandler } from '../../errors';

export const createStandaloneAgentApiKeyHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostStandaloneAgentAPIKeyRequestSchema.body>
> = async (context, request, response) => {
  try {
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const canCreate = await canCreateStandaloneAgentApiKey(esClient);

    if (!canCreate) {
      throw new FleetUnauthorizedError(
        `Missing permissions to create standalone API key, You need ${INDEX_PRIVILEGES.privileges.join(
          ', '
        )} for indices ${INDEX_PRIVILEGES.names.join(', ')}`
      );
    }

    const key = await createStandaloneAgentApiKey(esClient, request.body.name);

    return response.ok({
      body: {
        item: key,
      },
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
