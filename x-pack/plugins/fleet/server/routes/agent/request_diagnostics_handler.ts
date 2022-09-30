/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import * as AgentService from '../../services/agents';
import type { PostRequestDiagnosticsActionRequestSchema } from '../../types';
import { defaultFleetErrorHandler } from '../../errors';

export const requestDiagnosticsHandler: RequestHandler<
  TypeOf<typeof PostRequestDiagnosticsActionRequestSchema.params>,
  undefined,
  undefined
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  try {
    await AgentService.requestDiagnostics(esClient, request.params.agentId);

    return response.ok({ body: {} });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
