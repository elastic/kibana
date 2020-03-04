/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler } from 'kibana/server';
import { outputService, agentConfigService } from '../../services';
import { CreateFleetSetupRequestSchema, CreateFleetSetupResponse } from '../../types';
import { setup } from '../../services/setup';
import { generateEnrollmentAPIKey } from '../../services/api_keys';

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

export const createFleetSetupHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreateFleetSetupRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    await outputService.updateOutput(soClient, await outputService.getDefaultOutputId(soClient), {
      admin_username: request.body.admin_username,
      admin_password: request.body.admin_password,
    });
    await generateEnrollmentAPIKey(soClient, {
      name: 'Default',
      configId: await agentConfigService.getDefaultAgentConfigId(soClient),
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
    await setup(soClient, callCluster);
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
