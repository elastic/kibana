/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import {
  createStreamsRepositoryAdminClient,
  createStreamsRepositoryViewerClient,
} from './helpers/repository_client';
import { disableStreams, enableStreams } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let adminApiClient: StreamsSupertestRepositoryClient;
  let viewerApiClient: StreamsSupertestRepositoryClient;

  describe('Connectors endpoint', () => {
    before(async () => {
      adminApiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      viewerApiClient = await createStreamsRepositoryViewerClient(roleScopedSupertest);
      await enableStreams(adminApiClient);
    });

    after(async () => {
      await disableStreams(adminApiClient);
    });

    it('returns connectors array with admin permissions', async () => {
      const response = await adminApiClient.fetch('GET /internal/streams/connectors').expect(200);

      expect(response.body).to.have.property('connectors');
      expect(Array.isArray(response.body.connectors)).to.be(true);
    });

    it('returns connectors array with viewer permissions', async () => {
      const response = await viewerApiClient.fetch('GET /internal/streams/connectors').expect(200);

      expect(response.body).to.have.property('connectors');
      expect(Array.isArray(response.body.connectors)).to.be(true);
    });

    it('only returns supported GenAI connector types', async () => {
      const response = await adminApiClient.fetch('GET /internal/streams/connectors').expect(200);

      const { connectors } = response.body;

      // All returned connectors should be of supported GenAI types
      // Supported types: .gen-ai (OpenAI), .bedrock, .gemini, .inference
      const supportedTypes = ['.gen-ai', '.bedrock', '.gemini', '.inference'];

      for (const connector of connectors) {
        expect(supportedTypes).to.contain(connector.actionTypeId);

        // For .inference connectors, the taskType should be 'chat_completion'
        // (connectors with other taskTypes like 'sparse_embedding' should be filtered out)
        if (connector.actionTypeId === '.inference') {
          expect(connector.config?.taskType).to.be('chat_completion');
        }
      }
    });
  });
}
