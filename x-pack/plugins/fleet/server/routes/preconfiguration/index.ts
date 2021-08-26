/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from 'src/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type { PreconfiguredAgentPolicy } from '../../../common';

import { PLUGIN_ID, PRECONFIGURATION_API_ROUTES } from '../../constants';
import { PutPreconfigurationSchema } from '../../types';
import { defaultIngestErrorHandler } from '../../errors';
import { ensurePreconfiguredPackagesAndPolicies, outputService } from '../../services';

export const updatePreconfigurationHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PutPreconfigurationSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  const defaultOutput = await outputService.ensureDefaultOutput(soClient);

  const { agentPolicies, packages } = request.body;

  try {
    const body = await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      (agentPolicies as PreconfiguredAgentPolicy[]) ?? [],
      packages ?? [],
      defaultOutput
    );
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const registerRoutes = (router: IRouter) => {
  router.put(
    {
      path: PRECONFIGURATION_API_ROUTES.UPDATE_PATTERN,
      validate: PutPreconfigurationSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    updatePreconfigurationHandler
  );
};
