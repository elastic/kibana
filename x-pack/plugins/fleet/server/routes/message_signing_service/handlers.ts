/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_POLICY_INDEX, SO_SEARCH_LIMIT } from '../../../common';
import type { FleetRequestHandler } from '../../types';
import { defaultFleetErrorHandler, AgentPolicyNotFoundError } from '../../errors';
import { appContextService } from '../../services';

export const rotateKeyPairHandler: FleetRequestHandler<undefined, undefined, undefined> = async (
  context,
  _,
  response
) => {
  let newPublicKey: string | undefined;

  try {
    await appContextService.getMessageSigningService()?.rotateKeyPair();
    newPublicKey = await appContextService.getMessageSigningService()?.getPublicKey();
  } catch (error) {
    if (error instanceof AgentPolicyNotFoundError) {
      return response.notFound({
        body: {
          message: error.message,
        },
      });
    }
    return defaultFleetErrorHandler({ error, response });
  }

  if (!newPublicKey) {
    return response.customError({
      statusCode: 424,
      body: {
        message: 'Unable to update agent policies as no public key was found!',
      },
    });
  }

  const esClient = (await context.core).elasticsearch.client.asInternalUser;
  const agentPolicies = await esClient.search({ index: AGENT_POLICY_INDEX, size: SO_SEARCH_LIMIT });

  // bulk update .fleet-policies docs signing_key with the new public key
  const bulkUpdateList = agentPolicies.hits.hits.flatMap((agentPolicy) => [
    {
      update: {
        _id: agentPolicy._id,
      },
    },
    {
      doc: {
        data: {
          agent: {
            protection: {
              signing_key: newPublicKey,
            },
          },
        },
      },
    },
  ]);

  try {
    await esClient.bulk({
      index: AGENT_POLICY_INDEX,
      body: bulkUpdateList,
      refresh: 'wait_for',
      filter_path: 'items.*errors',
    });
    return response.ok({
      body: {
        message: 'Successfully rotated key pair',
      },
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
