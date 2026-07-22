/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type * as http from 'http';
import { v4 as uuidv4 } from 'uuid';
import {
  ECH_AGENTLESS_OUTPUT_ID,
  ECH_AGENTLESS_MANAGED_BULK_OUTPUT_ID,
} from '@kbn/fleet-plugin/common/constants';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupMockServer } from '../agents/helpers/mock_agentless_api';
import { SpaceTestApiClient } from '../space_awareness/api_helper';
import { cleanFleetIndices } from '../space_awareness/helpers';

export default function (providerContext: FtrProviderContext) {
  describe('Agentless managed bulk output', () => {
    const { getService } = providerContext;
    const es = getService('es');
    const supertest = getService('supertest');
    const kibanaServer = getService('kibanaServer');

    skipIfNoDockerRegistry(providerContext);

    const apiClient = new SpaceTestApiClient(supertest);

    let mockApiServer: http.Server;

    before(async () => {
      const mockAgentlessApiService = setupMockServer();
      mockApiServer = await mockAgentlessApiService.listen(8089);
    });

    after(async () => {
      await mockApiServer.close();
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
      await apiClient.setup();
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
    });

    it('should create the managed bulk output pointing at the managed OTLP endpoint, alongside the unchanged direct-ES agentless output', async () => {
      const { body: outputsRes } = await supertest.get('/api/fleet/outputs').expect(200);

      const directOutput = outputsRes.items.find(
        (item: { id: string }) => item.id === ECH_AGENTLESS_OUTPUT_ID
      );
      expect(directOutput).not.to.be(undefined);

      const bulkOutput = outputsRes.items.find(
        (item: { id: string }) => item.id === ECH_AGENTLESS_MANAGED_BULK_OUTPUT_ID
      );
      expect(bulkOutput).not.to.be(undefined);
      // Fleet normalizes output hosts to include an explicit port (see
      // normalizeHostsForAgents) — the default HTTPS port is added since none was configured.
      expect(bulkOutput.hosts).to.eql(['https://managed-otlp.ftr-test.invalid:443/_es']);
      expect(bulkOutput.is_preconfigured).to.be(true);
    });

    it('should route a bulk-supporting agentless policy to the managed bulk output', async () => {
      const id = uuidv4();

      const policy = await apiClient.createAgentlessPolicy({
        id,
        package: {
          name: 'test_agentless',
          version: '1.0.0',
        },
        name: `test_agentless-managed-bulk-${Date.now()}`,
        description: 'test agentless managed bulk policy',
        namespace: 'default',
        inputs: {
          'sample-httpjson': {
            enabled: true,
            vars: {
              api_key: 'TEST_VALUE_API_KEY',
            },
            streams: {},
          },
        },
      });

      const agentPolicy = await apiClient.getAgentPolicy(policy.item.id);
      expect(agentPolicy.item.data_output_id).to.be(ECH_AGENTLESS_MANAGED_BULK_OUTPUT_ID);
      expect(agentPolicy.item.monitoring_output_id).to.be(ECH_AGENTLESS_MANAGED_BULK_OUTPUT_ID);
    });

    it('should keep an OTel agentless policy on the direct-ES output', async () => {
      const id = uuidv4();

      const policy = await apiClient.createAgentlessPolicy({
        id,
        package: {
          name: 'test_agentless_otel',
          version: '1.0.0',
        },
        name: `test_agentless-otel-${Date.now()}`,
        description: 'test agentless otel policy',
        namespace: 'default',
        inputs: {
          'sample-otelcol': {
            enabled: true,
            streams: {},
          },
        },
      });

      const agentPolicy = await apiClient.getAgentPolicy(policy.item.id);
      expect(agentPolicy.item.data_output_id).to.be(ECH_AGENTLESS_OUTPUT_ID);
      expect(agentPolicy.item.monitoring_output_id).to.be(ECH_AGENTLESS_OUTPUT_ID);
    });
  });
}
