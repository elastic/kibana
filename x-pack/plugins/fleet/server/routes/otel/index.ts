/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FleetAuthzRouter } from '../../services/security';
import { API_VERSIONS, OTEL_POLICIES_ROUTES } from '../../../common/constants';
import { CreateOtelPolicyRequestSchema } from '../../types/rest_spec/otel';

import { createOtelPolicyHandler } from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // Create
  router.versioned
    .post({
      path: OTEL_POLICIES_ROUTES.CREATE_PATTERN,
      description: 'Create new otel policy',
      options: {
        tags: ['oas-tag:Fleet Otel policies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: CreateOtelPolicyRequestSchema,
        },
      },
      createOtelPolicyHandler
    );
};
