/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { SETTINGS_API_ROUTES } from '../../constants';
import type { FleetRequestHandler } from '../../types';
import { PutSettingsRequestSchema, GetSettingsRequestSchema } from '../../types';
import { defaultIngestErrorHandler } from '../../errors';
import { settingsService, agentPolicyService, appContextService } from '../../services';
import type { FleetAuthzRouter } from '../security';

export const getSettingsHandler: FleetRequestHandler = async (context, request, response) => {
  const soClient = (await context.fleet).epm.internalSoClient;

  try {
    const settings = await settingsService.getSettings(soClient);
    const body = {
      item: settings,
    };
    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Settings not found` },
      });
    }

    return defaultIngestErrorHandler({ error, response });
  }
};

export const putSettingsHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PutSettingsRequestSchema.body>
> = async (context, request, response) => {
  const soClient = (await context.fleet).epm.internalSoClient;
  const esClient = (await context.core).elasticsearch.client.asInternalUser;
  const user = await appContextService.getSecurity()?.authc.getCurrentUser(request);

  try {
    const settings = await settingsService.saveSettings(soClient, request.body);
    await agentPolicyService.bumpAllAgentPolicies(soClient, esClient, {
      user: user || undefined,
    });
    const body = {
      item: settings,
    };
    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Settings not found` },
      });
    }

    return defaultIngestErrorHandler({ error, response });
  }
};

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.get(
    {
      path: SETTINGS_API_ROUTES.INFO_PATTERN,
      validate: GetSettingsRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getSettingsHandler
  );
  router.put(
    {
      path: SETTINGS_API_ROUTES.UPDATE_PATTERN,
      validate: PutSettingsRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    putSettingsHandler
  );
};
