/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandler } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import { outputService, appContextService } from '../../services';
import { GetFleetStatusResponse } from '../../../common';
import { setupIngestManager, setupFleet } from '../../services/setup';
import { PostFleetSetupRequestSchema } from '../../types';

export const getFleetStatusHandler: RequestHandler = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    const isAdminUserSetup = (await outputService.getAdminUser(soClient)) !== null;
    const isApiKeysEnabled = await appContextService.getSecurity().authc.areAPIKeysEnabled();
    const isTLSEnabled = appContextService.getHttpSetup().getServerInfo().protocol === 'https';
    const isProductionMode = appContextService.getIsProductionMode();
    const isCloud = appContextService.getCloud()?.isCloudEnabled ?? false;
    const isTLSCheckDisabled = appContextService.getConfig()?.fleet?.tlsCheckDisabled ?? false;

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
    const callCluster = context.core.elasticsearch.adminClient.callAsCurrentUser;
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
  const callCluster = context.core.elasticsearch.adminClient.callAsCurrentUser;
  try {
    await setupIngestManager(soClient, callCluster);
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
