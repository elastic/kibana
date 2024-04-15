/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../services';
import type { GetFleetStatusResponse, PostFleetSetupResponse } from '../../../common/types';
import { formatNonFatalErrors, setupFleet } from '../../services/setup';
import { hasFleetServers } from '../../services/fleet_server';
import { defaultFleetErrorHandler } from '../../errors';
import type { FleetRequestHandler } from '../../types';
import { getGpgKeyIdOrUndefined } from '../../services/epm/packages/package_verification';
import { isSecretStorageEnabled } from '../../services/secrets';

export const getFleetStatusHandler: FleetRequestHandler = async (context, request, response) => {
  const coreContext = await context.core;
  const fleetContext = await context.fleet;

  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = fleetContext.internalSoClient;

  try {
    const isApiKeysEnabled = await appContextService
      .getSecurity()
      .authc.apiKeys.areAPIKeysEnabled();
    const isFleetServerMissing = !(await hasFleetServers(
      coreContext.elasticsearch.client.asInternalUser
    ));

    const isFleetServerStandalone =
      appContextService.getConfig()?.internal?.fleetServerStandalone ?? false;
    const missingRequirements: GetFleetStatusResponse['missing_requirements'] = [];
    const missingOptionalFeatures: GetFleetStatusResponse['missing_optional_features'] = [];

    if (!isApiKeysEnabled) {
      missingRequirements.push('api_keys');
    }

    if (!isFleetServerStandalone && isFleetServerMissing) {
      missingRequirements.push('fleet_server');
    }

    if (!appContextService.getEncryptedSavedObjectsSetup()?.canEncrypt) {
      missingOptionalFeatures.push('encrypted_saved_object_encryption_key_required');
    }

    const useSecretsStorage = await isSecretStorageEnabled(esClient, soClient);

    const body: GetFleetStatusResponse = {
      isReady: missingRequirements.length === 0,
      missing_requirements: missingRequirements,
      missing_optional_features: missingOptionalFeatures,
      is_secrets_storage_enabled: useSecretsStorage,
    };

    const packageVerificationKeyId = await getGpgKeyIdOrUndefined();

    if (packageVerificationKeyId) {
      body.package_verification_key_id = packageVerificationKeyId;
    }

    return response.ok({
      body,
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const fleetSetupHandler: FleetRequestHandler = async (context, request, response) => {
  try {
    const soClient = (await context.fleet).internalSoClient;
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    const setupStatus = await setupFleet(soClient, esClient);
    const body: PostFleetSetupResponse = {
      ...setupStatus,
      nonFatalErrors: formatNonFatalErrors(setupStatus.nonFatalErrors),
    };
    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
