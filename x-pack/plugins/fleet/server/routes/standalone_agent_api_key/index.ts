/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS } from '../../../common/constants';

import { CREATE_STANDALONE_AGENT_API_KEY_ROUTE } from '../../constants';

import { PostStandaloneAgentAPIKeyRequestSchema } from '../../types';

import { createStandaloneAgentApiKeyHandler } from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      path: CREATE_STANDALONE_AGENT_API_KEY_ROUTE,
      access: 'internal',
      fleetAuthz: {
        fleet: { addAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: PostStandaloneAgentAPIKeyRequestSchema },
      },
      createStandaloneAgentApiKeyHandler
    );
};
