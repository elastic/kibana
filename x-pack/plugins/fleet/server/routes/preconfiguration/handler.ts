/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { FleetRequestHandler } from '../../types';
import type { PostResetOnePreconfiguredAgentPoliciesSchema } from '../../types';
import { defaultFleetErrorHandler } from '../../errors';
import { resetPreconfiguredAgentPolicies } from '../../services/preconfiguration/reset_agent_policies';

export const resetOnePreconfigurationHandler: FleetRequestHandler<
  TypeOf<typeof PostResetOnePreconfiguredAgentPoliciesSchema.params>,
  undefined,
  undefined
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  try {
    await resetPreconfiguredAgentPolicies(soClient, esClient, request.params.agentPolicyId);
    return response.ok({});
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const resetPreconfigurationHandler: FleetRequestHandler<
  undefined,
  undefined,
  undefined
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  try {
    await resetPreconfiguredAgentPolicies(soClient, esClient);
    return response.ok({});
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
