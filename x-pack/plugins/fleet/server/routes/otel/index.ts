/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FleetAuthzRouter } from '../../services/security';
import {
  API_VERSIONS,
  OTEL_POLICIES_ROUTES,
  OTEL_INTEGRATIONS_ROUTES,
} from '../../../common/constants';
import {
  CreateOtelPolicyRequestSchema,
  InstallOtelIntegrationRequestSchema,
} from '../../types/rest_spec/otel';

const MAX_FILE_SIZE_BYTES = 104857600; // 100MB

import { createOtelPolicyHandler, createOtelIntegrationPolicyHandler } from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // Create policy
  router.versioned
    .post({
      path: OTEL_POLICIES_ROUTES.CREATE_PATTERN,
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
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

  // create integration
  router.versioned
    .post({
      path: OTEL_INTEGRATIONS_ROUTES.CREATE_PATTERN,
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
      description: 'Create new otel integration',
      options: {
        tags: ['oas-tag:Fleet Otel integrations'],
        body: {
          accepts: ['application/x-yaml', 'text/x-yaml'],
          parse: false,
          maxBytes: MAX_FILE_SIZE_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: InstallOtelIntegrationRequestSchema,
        },
      },
      createOtelIntegrationPolicyHandler
    );
};
