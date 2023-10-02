/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';
import { API_VERSIONS } from '../../../common/constants';
import { MESSAGE_SIGNING_SERVICE_API_ROUTES } from '../../constants';
import { RotateKeyPairSchema } from '../../types';

import { rotateKeyPairHandler } from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // Rotate fleet message signing key pair
  router.versioned
    .post({
      path: MESSAGE_SIGNING_SERVICE_API_ROUTES.ROTATE_KEY_PAIR,
      fleetAuthz: {
        fleet: { all: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: RotateKeyPairSchema },
      },
      rotateKeyPairHandler
    );
};
