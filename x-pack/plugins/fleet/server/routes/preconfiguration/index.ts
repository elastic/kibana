/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from 'src/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type { PreconfiguredAgentPolicy } from '../../../common';

import { PRECONFIGURATION_API_ROUTES } from '../../constants';
import type { FleetRequestHandler } from '../../types';
import { PutPreconfigurationSchema } from '../../types';
import { defaultIngestErrorHandler } from '../../errors';
import { ensurePreconfiguredPackagesAndPolicies, outputService } from '../../services';
import type { FleetAuthzRouter } from '../security';

export const updatePreconfigurationHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PutPreconfigurationSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const defaultOutput = await outputService.ensureDefaultOutput(soClient);
  const spaceId = context.fleet.spaceId;
  const { agentPolicies, packages } = request.body;

  try {
    const body = await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      (agentPolicies as PreconfiguredAgentPolicy[]) ?? [],
      packages ?? [],
      defaultOutput,
      spaceId
    );
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.put(
    {
      path: PRECONFIGURATION_API_ROUTES.UPDATE_PATTERN,
      validate: PutPreconfigurationSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    updatePreconfigurationHandler as RequestHandler
  );
};
