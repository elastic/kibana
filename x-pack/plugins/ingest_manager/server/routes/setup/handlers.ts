/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandler } from 'src/core/server';
import { outputService } from '../../services';
import { CreateFleetSetupResponse } from '../../../common';
import { setupIngestManager, setupFleet } from '../../services/setup';

export const getFleetSetupHandler: RequestHandler = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const successBody: CreateFleetSetupResponse = { isInitialized: true };
  const failureBody: CreateFleetSetupResponse = { isInitialized: false };
  try {
    const adminUser = await outputService.getAdminUser(soClient);
    if (adminUser) {
      return response.ok({
        body: successBody,
      });
    } else {
      return response.ok({
        body: failureBody,
      });
    }
  } catch (e) {
    return response.ok({
      body: failureBody,
    });
  }
};

export const createFleetSetupHandler: RequestHandler = async (context, request, response) => {
  try {
    const soClient = context.core.savedObjects.client;
    const callCluster = context.core.elasticsearch.adminClient.callAsCurrentUser;
    await setupIngestManager(soClient, callCluster);
    await setupFleet(soClient, callCluster);

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
