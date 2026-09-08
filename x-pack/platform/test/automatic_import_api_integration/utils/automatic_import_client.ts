/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from 'supertest';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type {
  CreateAutoImportIntegrationRequestBody,
  CreateAutoImportIntegrationResponse,
  GetAllAutoImportIntegrationsResponse,
  GetAutoImportIntegrationResponse,
} from '@kbn/automatic-import-plugin/common';

export function createAutomaticImportApiClient(supertest: Agent) {
  return {
    /**
     * Get all integrations
     */
    async getAllIntegrations(): Promise<GetAllAutoImportIntegrationsResponse> {
      const res = await supertest
        .get('/api/automatic_import/integrations')
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'automatic-import-test')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);
      return res.body;
    },

    /**
     * Get integration by ID
     */
    async getIntegrationById(integrationId: string): Promise<GetAutoImportIntegrationResponse> {
      const res = await supertest
        .get(`/api/automatic_import/integrations/${integrationId}`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'automatic-import-test')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);
      return res.body;
    },

    /**
     * Create or update an integration
     */
    async createIntegration(
      payload: CreateAutoImportIntegrationRequestBody
    ): Promise<CreateAutoImportIntegrationResponse> {
      const res = await supertest
        .put('/api/automatic_import/integrations')
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'automatic-import-test')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .send(payload)
        .expect(200);
      return res.body;
    },
  };
}

export type AutomaticImportApiClient = ReturnType<typeof createAutomaticImportApiClient>;
