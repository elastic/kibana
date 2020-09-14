/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import { PostAgentUpgradeResponse } from '../../../common/types';
import { PostAgentUpgradeRequestSchema } from '../../types';
import * as AgentService from '../../services/agents';

export const postAgentUpgradeHandler: RequestHandler<
  TypeOf<typeof PostAgentUpgradeRequestSchema.params>,
  undefined
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    await AgentService.upgradeAgent(soClient, request.params.agentId);

    const body: PostAgentUpgradeResponse = {};
    return response.ok({ body });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};
