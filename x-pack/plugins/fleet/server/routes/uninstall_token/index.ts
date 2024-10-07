/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNINSTALL_TOKEN_ROUTES, API_VERSIONS } from '../../../common/constants';
import type { FleetConfigType } from '../../config';

import type { FleetAuthzRouter } from '../../services/security';
import {
  GetUninstallTokenRequestSchema,
  GetUninstallTokenResponseSchema,
  GetUninstallTokensMetadataRequestSchema,
  GetUninstallTokensMetadataResponseSchema,
} from '../../types/rest_spec/uninstall_token';
import { parseExperimentalConfigValue } from '../../../common/experimental_features';

import { genericErrorResponse } from '../schema/errors';

import { getUninstallTokenHandler, getUninstallTokensMetadataHandler } from './handlers';

export const registerRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  const experimentalFeatures = parseExperimentalConfigValue(config.enableExperimental);

  if (experimentalFeatures.agentTamperProtectionEnabled) {
    router.versioned
      .get({
        path: UNINSTALL_TOKEN_ROUTES.LIST_PATTERN,
        fleetAuthz: {
          fleet: { allAgents: true },
        },
        description: 'List metadata for latest uninstall tokens per agent policy',
        options: {
          tags: ['oas-tag:Fleet uninstall tokens'],
        },
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          validate: {
            request: GetUninstallTokensMetadataRequestSchema,
            response: {
              200: {
                body: () => GetUninstallTokensMetadataResponseSchema,
              },
              400: {
                body: genericErrorResponse,
              },
            },
          },
        },
        getUninstallTokensMetadataHandler
      );

    router.versioned
      .get({
        path: UNINSTALL_TOKEN_ROUTES.INFO_PATTERN,
        fleetAuthz: {
          fleet: { allAgents: true },
        },
        description: 'Get one decrypted uninstall token by its ID',
        options: {
          tags: ['oas-tag:Fleet uninstall tokens'],
        },
      })
      .addVersion(
        {
          version: API_VERSIONS.public.v1,
          validate: {
            request: GetUninstallTokenRequestSchema,
            response: {
              200: {
                body: () => GetUninstallTokenResponseSchema,
              },
              400: {
                body: genericErrorResponse,
              },
            },
          },
        },
        getUninstallTokenHandler
      );
  }
};
