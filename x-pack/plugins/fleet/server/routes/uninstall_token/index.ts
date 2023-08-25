/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UNINSTALL_TOKEN_ROUTES, OLDEST_PUBLIC_VERSION } from '../../../common/constants';
import type { FleetConfigType } from '../../config';

import type { FleetAuthzRouter } from '../../services/security';
import {
  GetUninstallTokenRequestSchema,
  GetUninstallTokensMetadataRequestSchema,
} from '../../types/rest_spec/uninstall_token';
import { parseExperimentalConfigValue } from '../../../common/experimental_features';

import { getUninstallTokenHandler, getUninstallTokensMetadataHandler } from './handlers';

export const registerRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  const experimentalFeatures = parseExperimentalConfigValue(config.enableExperimental);

  if (experimentalFeatures.agentTamperProtectionEnabled) {
    router.versioned
      .get({
        path: UNINSTALL_TOKEN_ROUTES.LIST_PATTERN,
        fleetAuthz: {
          fleet: { all: true },
        },
      })
      .addVersion(
        {
          version: OLDEST_PUBLIC_VERSION,
          validate: { request: GetUninstallTokensMetadataRequestSchema },
        },
        getUninstallTokensMetadataHandler
      );

    router.versioned
      .get({
        path: UNINSTALL_TOKEN_ROUTES.INFO_PATTERN,
        fleetAuthz: {
          fleet: { all: true },
        },
      })
      .addVersion(
        {
          version: OLDEST_PUBLIC_VERSION,
          validate: { request: GetUninstallTokenRequestSchema },
        },
        getUninstallTokenHandler
      );
  }
};
