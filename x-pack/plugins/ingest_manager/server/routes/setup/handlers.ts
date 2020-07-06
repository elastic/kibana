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
import { IngestManagerError, getHTTPResponseCode } from '../../errors';

export const getFleetStatusHandler: RequestHandler = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const isAdminUserSetup = (await outputService.getAdminUser(soClient)) !== null;
    const isApiKeysEnabled = await appContextService.getSecurity().authc.areAPIKeysEnabled();
    const isTLSEnabled = appContextService.getHttpSetup().getServerInfo().protocol === 'https';
    const isProductionMode = appContextService.getIsProductionMode();
    const isCloud = appContextService.getCloud()?.isCloudEnabled ?? false;
    const isTLSCheckDisabled = appContextService.getConfig()?.fleet?.tlsCheckDisabled ?? false;
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
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
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
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};

export const ingestManagerSetupHandler: RequestHandler = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const callCluster = context.core.elasticsearch.legacy.client.callAsCurrentUser;
  const logger = appContextService.getLogger();
  try {
    const body: PostIngestSetupResponse = { isInitialized: true };
    await setupIngestManager(soClient, callCluster);
    return response.ok({
      body,
    });
  } catch (e) {
    if (e instanceof IngestManagerError) {
      logger.error(e.message);
      return response.customError({
        statusCode: getHTTPResponseCode(e),
        body: { message: e.message },
      });
    }
    if (e.isBoom) {
      logger.error(e.output.payload.message);
      return response.customError({
        statusCode: e.output.statusCode,
        body: { message: e.output.payload.message },
      });
    }
    logger.error(e.message);
    logger.error(e.stack);
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};
