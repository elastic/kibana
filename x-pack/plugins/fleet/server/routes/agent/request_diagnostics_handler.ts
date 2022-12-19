/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import * as AgentService from '../../services/agents';
import type {
  PostBulkRequestDiagnosticsActionRequestSchema,
  PostRequestDiagnosticsActionRequestSchema,
} from '../../types';
import { defaultFleetErrorHandler } from '../../errors';

export const requestDiagnosticsHandler: RequestHandler<
  TypeOf<typeof PostRequestDiagnosticsActionRequestSchema.params>,
  undefined,
  undefined
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  try {
    const result = await AgentService.requestDiagnostics(esClient, request.params.agentId);

    return response.ok({ body: { actionId: result.actionId } });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const bulkRequestDiagnosticsHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkRequestDiagnosticsActionRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  const agentOptions = Array.isArray(request.body.agents)
    ? { agentIds: request.body.agents }
    : { kuery: request.body.agents };
  try {
    const result = await AgentService.bulkRequestDiagnostics(esClient, soClient, {
      ...agentOptions,
      batchSize: request.body.batchSize,
    });

    return response.ok({ body: { actionId: result.actionId } });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
