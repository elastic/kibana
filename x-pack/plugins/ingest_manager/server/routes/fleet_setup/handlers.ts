/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';
import { RequestHandler } from 'kibana/server';
import { DEFAULT_OUTPUT_ID } from '../../constants';
import { outputService, agentConfigService } from '../../services';
import { CreateFleetSetupRequestSchema, CreateFleetSetupResponse } from '../../types';

export const getFleetSetupHandler: RequestHandler = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const successBody: CreateFleetSetupResponse = { isInitialized: true };
  const failureBody: CreateFleetSetupResponse = { isInitialized: false };
  try {
    const output = await outputService.get(soClient, DEFAULT_OUTPUT_ID);
    if (output) {
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
    await outputService.createDefaultOutput(soClient, {
      username: request.body.admin_username,
      password: request.body.admin_password,
    });
    await agentConfigService.ensureDefaultAgentConfig(soClient);
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
