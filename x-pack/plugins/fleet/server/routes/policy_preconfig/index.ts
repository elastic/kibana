/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from 'src/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type { FleetConfigType } from '../../../common';

import { PLUGIN_ID, POLICY_PRECONFIG_API_ROUTES } from '../../constants';
import { PutPolicyPreconfigSchema } from '../../types';
import { defaultIngestErrorHandler } from '../../errors';
import { ensurePreconfiguredPackagesAndPolicies, outputService } from '../../services';

export const putPolicyPreconfigHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PutPolicyPreconfigSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  const defaultOutput = await outputService.ensureDefaultOutput(soClient);

  const { agentPolicies, packages } = request.body;

  try {
    const body = await ensurePreconfiguredPackagesAndPolicies(
      soClient,
      esClient,
      (agentPolicies as FleetConfigType['agentPolicies']) ?? [],
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
      path: POLICY_PRECONFIG_API_ROUTES.PUT_PRECONFIG,
      validate: PutPolicyPreconfigSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    putPolicyPreconfigHandler
  );
};
