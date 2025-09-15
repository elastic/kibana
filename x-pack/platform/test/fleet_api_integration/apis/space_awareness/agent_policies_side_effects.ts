/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CreateAgentPolicyResponse } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import { cleanFleetIndices } from './helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  let TEST_SPACE_1: string;

  describe('agent policies side effects', function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClient = new SpaceTestApiClient(supertest);

    let defaultSpacePolicy1: CreateAgentPolicyResponse;
    let spaceTest1Policy1: CreateAgentPolicyResponse;

    before(async () => {
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);

      await apiClient.postEnableSpaceAwareness();
      await spaces.createTestSpace(TEST_SPACE_1);

      const [_defaultSpacePolicy1, _spaceTest1Policy1] = await Promise.all([
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(TEST_SPACE_1),
      ]);
      defaultSpacePolicy1 = _defaultSpacePolicy1;
      spaceTest1Policy1 = _spaceTest1Policy1;
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    describe('Download source', () => {
      let downloadSourceId: string;
      before(async () => {
        const res = await apiClient.postDownloadSource({
          name: `test ${Date.now()}`,
          host: 'https://test.fr',
        });
        downloadSourceId = res.item.id;
        await Promise.all([
          apiClient.putAgentPolicy(defaultSpacePolicy1.item.id, {
            name: defaultSpacePolicy1.item.name,
            namespace: defaultSpacePolicy1.item.namespace,
            description: defaultSpacePolicy1.item.description,
            download_source_id: downloadSourceId,
          }),
          apiClient.putAgentPolicy(
            spaceTest1Policy1.item.id,
            {
              name: spaceTest1Policy1.item.name,
              namespace: spaceTest1Policy1.item.namespace,
              description: spaceTest1Policy1.item.description,
              download_source_id: downloadSourceId,
            },
            TEST_SPACE_1
          ),
        ]);
      });
      it('should remove download_source_id accross spaces', async () => {
        const policiesResBefore = await Promise.all([
          apiClient.getAgentPolicy(defaultSpacePolicy1.item.id),
          apiClient.getAgentPolicy(spaceTest1Policy1.item.id, TEST_SPACE_1),
        ]);

        for (const policyRes of policiesResBefore) {
          expect(policyRes.item.download_source_id).to.be(downloadSourceId);
        }

        await apiClient.deleteDownloadSource(downloadSourceId);

        const policiesResAfter = await Promise.all([
          apiClient.getAgentPolicy(defaultSpacePolicy1.item.id),
          apiClient.getAgentPolicy(spaceTest1Policy1.item.id, TEST_SPACE_1),
        ]);

        for (const policyRes of policiesResAfter) {
          expect(policyRes.item.download_source_id).not.to.be(downloadSourceId);
        }
      });
    });

    describe('Fleet server host', () => {
      let fleetServerHostId: string;
      before(async () => {
        const res = await apiClient.postFleetServerHosts({
          name: `test ${Date.now()}`,
          host_urls: ['https://test.fr'],
        });
        fleetServerHostId = res.item.id;
        await Promise.all([
          apiClient.putAgentPolicy(defaultSpacePolicy1.item.id, {
            name: defaultSpacePolicy1.item.name,
            namespace: defaultSpacePolicy1.item.namespace,
            description: defaultSpacePolicy1.item.description,
            fleet_server_host_id: fleetServerHostId,
          }),
          apiClient.putAgentPolicy(
            spaceTest1Policy1.item.id,
            {
              name: spaceTest1Policy1.item.name,
              namespace: spaceTest1Policy1.item.namespace,
              description: spaceTest1Policy1.item.description,
              fleet_server_host_id: fleetServerHostId,
            },
            TEST_SPACE_1
          ),
        ]);
      });
      it('should remove fleet server host accross spaces', async () => {
        const policiesResBefore = await Promise.all([
          apiClient.getAgentPolicy(defaultSpacePolicy1.item.id),
          apiClient.getAgentPolicy(spaceTest1Policy1.item.id, TEST_SPACE_1),
        ]);

        for (const policyRes of policiesResBefore) {
          expect(policyRes.item.fleet_server_host_id).to.be(fleetServerHostId);
        }

        await apiClient.deleteFleetServerHosts(fleetServerHostId);

        const policiesResAfter = await Promise.all([
          apiClient.getAgentPolicy(defaultSpacePolicy1.item.id),
          apiClient.getAgentPolicy(spaceTest1Policy1.item.id, TEST_SPACE_1),
        ]);

        for (const policyRes of policiesResAfter) {
          expect(policyRes.item.fleet_server_host_id).not.to.be(fleetServerHostId);
        }
      });
    });

    describe('Output', () => {
      let outputId: string;
      before(async () => {
        const res = await apiClient.postOutput({
          name: `test ${Date.now()}`,
          type: 'elasticsearch',
          is_default: false,
          is_default_monitoring: false,
          hosts: ['https://test.fr'],
        });
        outputId = res.item.id;
        await Promise.all([
          apiClient.putAgentPolicy(defaultSpacePolicy1.item.id, {
            name: defaultSpacePolicy1.item.name,
            namespace: defaultSpacePolicy1.item.namespace,
            description: defaultSpacePolicy1.item.description,
            data_output_id: outputId,
            monitoring_output_id: outputId,
          }),
          apiClient.putAgentPolicy(
            spaceTest1Policy1.item.id,
            {
              name: spaceTest1Policy1.item.name,
              namespace: spaceTest1Policy1.item.namespace,
              description: spaceTest1Policy1.item.description,
              data_output_id: outputId,
              monitoring_output_id: outputId,
            },
            TEST_SPACE_1
          ),
        ]);
      });
      it('should remove output host accross spaces', async () => {
        const policiesResBefore = await Promise.all([
          apiClient.getAgentPolicy(defaultSpacePolicy1.item.id),
          apiClient.getAgentPolicy(spaceTest1Policy1.item.id, TEST_SPACE_1),
        ]);

        for (const policyRes of policiesResBefore) {
          expect(policyRes.item.data_output_id).to.be(outputId);
          expect(policyRes.item.monitoring_output_id).to.be(outputId);
        }

        await apiClient.deleteOutput(outputId);

        const policiesResAfter = await Promise.all([
          apiClient.getAgentPolicy(defaultSpacePolicy1.item.id),
          apiClient.getAgentPolicy(spaceTest1Policy1.item.id, TEST_SPACE_1),
        ]);

        for (const policyRes of policiesResAfter) {
          expect(policyRes.item.data_output_id).not.to.be(outputId);
          expect(policyRes.item.monitoring_output_id).not.to.be(outputId);
        }
      });
    });
  });
}
