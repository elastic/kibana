/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetRequestHandler } from '../../types';

import { defaultFleetErrorHandler, AgentPolicyNotFoundError } from '../../errors';
import { appContextService } from '../../services';

export const rotateKeyPairHandler: FleetRequestHandler<undefined, undefined, unknown> = async (
  _,
  __,
  response
) => {
  try {
    await appContextService.getMessageSigningService()?.rotateKeyPair();
    return response.ok();
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
};
