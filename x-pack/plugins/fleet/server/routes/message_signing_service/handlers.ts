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
  try {
    const rotateKeyPairResponse = await appContextService
      .getMessageSigningService()
      ?.rotateKeyPair();

    if (!rotateKeyPairResponse) {
      return response.customError({
        statusCode: 500,
        body: {
          message: 'Failed to rotate key pair!',
        },
      });
    }
    return response.ok({
      body: {
        message: 'Key pair rotated successfully.',
      },
    });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
