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
import { appContextService } from '../../services';

export const postAgentUpgradeHandler: RequestHandler<
  TypeOf<typeof PostAgentUpgradeRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentUpgradeRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const { version, source_uri: sourceUri } = request.body;

  // temporarily only allow upgrading to the same version as the installed kibana version
  const kibanaVersion = appContextService.getKibanaVersion();
  if (kibanaVersion !== version) {
    return response.customError({
      statusCode: 400,
      body: {
        message: `cannot upgrade agent to ${version} because it is different than the installed kibana version ${kibanaVersion}`,
      },
    });
  }

  try {
    await AgentService.sendUpgradeAgentAction({
      soClient,
      agentId: request.params.agentId,
      version,
      sourceUri,
    });

    const body: PostAgentUpgradeResponse = {};
    return response.ok({ body });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};
