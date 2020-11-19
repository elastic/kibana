/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandler } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import { outputService, appContextService } from '../../services';
import { GetFleetStatusResponse, PostIngestSetupResponse } from '../../../common';
import { setupIngestManager, setupFleet } from '../../services/setup';
import { PostFleetSetupRequestSchema } from '../../types';
import { defaultIngestErrorHandler } from '../../errors';

export const getFleetStatusHandler: RequestHandler = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const isAdminUserSetup = (await outputService.getAdminUser(soClient)) !== null;
    const isApiKeysEnabled = await appContextService.getSecurity().authc.areAPIKeysEnabled();
    const isTLSEnabled = appContextService.getHttpSetup().getServerInfo().protocol === 'https';
    const isProductionMode = appContextService.getIsProductionMode();
    const isCloud = appContextService.getCloud()?.isCloudEnabled ?? false;
    const isTLSCheckDisabled = appContextService.getConfig()?.agents?.tlsCheckDisabled ?? false;
    const isUsingEphemeralEncryptionKey = appContextService.getEncryptedSavedObjectsSetup()
      .usingEphemeralEncryptionKey;

    const missingRequirements: GetFleetStatusResponse['missing_requirements'] = [];
    if (!isAdminUserSetup) {
      missingRequirements.push('fleet_admin_user');
    }
    if (!isApiKeysEnabled) {
      missingRequirements.push('api_keys');
    }
    if (!isTLSCheckDisabled && !isCloud && isProductionMode && !isTLSEnabled) {
      missingRequirements.push('tls_required');
    }

    if (isUsingEphemeralEncryptionKey) {
      missingRequirements.push('encrypted_saved_object_encryption_key_required');
    }

    const body: GetFleetStatusResponse = {
      isReady: missingRequirements.length === 0,
      missing_requirements: missingRequirements,
    };

    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const createFleetSetupHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostFleetSetupRequestSchema.body>
> = async (context, request, response) => {
  try {
    const soClient = context.core.savedObjects.client;
    const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
    await setupIngestManager(soClient, callCluster);
    await setupFleet(soClient, callCluster, {
      forceRecreate: request.body?.forceRecreate ?? false,
    });

    return response.ok({
      body: { isInitialized: true },
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const FleetSetupHandler: RequestHandler = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;

  try {
    const body: PostIngestSetupResponse = { isInitialized: true };
    await setupIngestManager(soClient, callCluster);
    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
