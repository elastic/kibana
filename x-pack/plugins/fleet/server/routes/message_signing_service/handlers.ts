/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { FleetRequestHandler } from '../../types';

import { defaultFleetErrorHandler } from '../../errors';
import { appContextService } from '../../services';
import type { RotateKeyPairSchema } from '../../types/rest_spec/message_signing_service';

export const rotateKeyPairHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof RotateKeyPairSchema.query>,
  undefined
> = async (_, __, response) => {
  const logger = appContextService.getLogger();
  const messageSigningService = appContextService.getMessageSigningService();
  if (!messageSigningService) {
    const errorMessage = 'Failed to rotate key pair. Message signing service is unavailable!';
    logger.error(errorMessage);
    return response.customError({
      statusCode: 500,
      body: {
        message: errorMessage,
      },
    });
  }

  try {
    await messageSigningService.rotateKeyPair();

    return response.ok({
      body: {
        message: 'Key pair rotated successfully.',
      },
    });
  } catch (error) {
    logger.error(error.meta);
    return defaultFleetErrorHandler({ error, response });
  }
};
