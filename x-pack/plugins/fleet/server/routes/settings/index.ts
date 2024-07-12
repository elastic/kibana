/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { API_VERSIONS } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';

import { SETTINGS_API_ROUTES } from '../../constants';
import type { FleetRequestHandler } from '../../types';
import {
  PutSettingsRequestSchema,
  GetSettingsRequestSchema,
  GetEnrollmentSettingsRequestSchema,
} from '../../types';
import { defaultFleetErrorHandler } from '../../errors';
import { settingsService, agentPolicyService, appContextService } from '../../services';

import { getEnrollmentSettingsHandler } from './enrollment_settings_handler';

export const getSettingsHandler: FleetRequestHandler = async (context, request, response) => {
  const soClient = (await context.fleet).internalSoClient;

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

    return defaultFleetErrorHandler({ error, response });
  }
};

export const putSettingsHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PutSettingsRequestSchema.body>
> = async (context, request, response) => {
  const soClient = (await context.fleet).internalSoClient;
  const esClient = (await context.core).elasticsearch.client.asInternalUser;
  const user = appContextService.getSecurityCore().authc.getCurrentUser(request) || undefined;

  try {
    const settings = await settingsService.saveSettings(soClient, request.body);
    await agentPolicyService.bumpAllAgentPolicies(esClient, { user });
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

    return defaultFleetErrorHandler({ error, response });
  }
};

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .get({
      path: SETTINGS_API_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        fleet: { readSettings: true },
      },
      description: `Get settings`,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetSettingsRequestSchema },
      },
      getSettingsHandler
    );
  router.versioned
    .put({
      path: SETTINGS_API_ROUTES.UPDATE_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
      description: `Update settings`,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PutSettingsRequestSchema },
      },
      putSettingsHandler
    );
  router.versioned
    .get({
      path: SETTINGS_API_ROUTES.ENROLLMENT_INFO_PATTERN,
      fleetAuthz: (authz) => {
        return authz.fleet.addAgents || authz.fleet.addFleetServers;
      },
      description: `Get enrollment settings`,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetEnrollmentSettingsRequestSchema },
      },
      getEnrollmentSettingsHandler
    );
};
