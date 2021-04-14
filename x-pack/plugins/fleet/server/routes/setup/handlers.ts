/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from 'src/core/server';
import type { TypeOf } from '@kbn/config-schema';

import { appContextService } from '../../services';
import type { GetFleetStatusResponse, PostIngestSetupResponse } from '../../../common';
import { setupFleet, setupIngestManager } from '../../services/setup';
import { hasFleetServers } from '../../services/fleet_server';
import { defaultIngestErrorHandler } from '../../errors';
import type { PostFleetSetupRequestSchema } from '../../types';

export const getFleetStatusHandler: RequestHandler = async (context, request, response) => {
  try {
    const isApiKeysEnabled = await appContextService
      .getSecurity()
      .authc.apiKeys.areAPIKeysEnabled();
    const isFleetServerSetup = await hasFleetServers(appContextService.getInternalUserESClient());
    const canEncrypt = appContextService.getEncryptedSavedObjectsSetup()?.canEncrypt === true;

    const missingRequirements: GetFleetStatusResponse['missing_requirements'] = [];
    if (!isApiKeysEnabled) {
      missingRequirements.push('api_keys');
    }
    if (!canEncrypt) {
      missingRequirements.push('encrypted_saved_object_encryption_key_required');
    }
    if (!isFleetServerSetup) {
      missingRequirements.push('fleet_server');
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

export const FleetSetupHandler: RequestHandler = async (context, request, response) => {
  try {
    const soClient = context.core.savedObjects.client;
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    const body: PostIngestSetupResponse = { isInitialized: true };
    await setupIngestManager(soClient, esClient);

    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

// TODO should be removed as part https://github.com/elastic/kibana/issues/94303
export const FleetAgentSetupHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostFleetSetupRequestSchema.body>
> = async (context, request, response) => {
  try {
    const soClient = context.core.savedObjects.client;
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    const body: PostIngestSetupResponse = { isInitialized: true };
    await setupIngestManager(soClient, esClient);
    await setupFleet(soClient, esClient, { forceRecreate: request.body?.forceRecreate === true });

    return response.ok({
      body,
    });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
