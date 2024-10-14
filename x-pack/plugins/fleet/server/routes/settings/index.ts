/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseExperimentalConfigValue } from '../../../common/experimental_features';
import { API_VERSIONS } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';
import { SETTINGS_API_ROUTES } from '../../constants';
import {
  PutSettingsRequestSchema,
  GetSettingsRequestSchema,
  GetEnrollmentSettingsRequestSchema,
  GetSpaceSettingsRequestSchema,
  PutSpaceSettingsRequestSchema,
} from '../../types';
import type { FleetConfigType } from '../../config';

import { getEnrollmentSettingsHandler } from './enrollment_settings_handler';

import {
  getSettingsHandler,
  getSpaceSettingsHandler,
  putSettingsHandler,
  putSpaceSettingsHandler,
} from './settings_handler';

export const registerRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  const experimentalFeatures = parseExperimentalConfigValue(config.enableExperimental);
  if (experimentalFeatures.useSpaceAwareness) {
    router.versioned
      .get({
        path: SETTINGS_API_ROUTES.SPACE_INFO_PATTERN,
        fleetAuthz: (authz) => {
          return (
            authz.fleet.readSettings ||
            authz.integrations.writeIntegrationPolicies ||
            authz.fleet.allAgentPolicies
          );
        },
        description: `Get space settings`,
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          validate: { request: GetSpaceSettingsRequestSchema },
        },
        getSpaceSettingsHandler
      );

    router.versioned
      .put({
        path: SETTINGS_API_ROUTES.SPACE_UPDATE_PATTERN,
        fleetAuthz: {
          fleet: { allSettings: true },
        },
        description: `Put space settings`,
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          validate: { request: PutSpaceSettingsRequestSchema },
        },
        putSpaceSettingsHandler
      );
  }

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
