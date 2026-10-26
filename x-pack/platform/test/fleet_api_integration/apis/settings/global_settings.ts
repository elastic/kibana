/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { CreateAgentPolicyResponse } from '@kbn/fleet-plugin/common';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from '../space_awareness/api_helper';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');
  const apiClient = new SpaceTestApiClient(supertest);
  const retry = getService('retry');

  // Failing: See https://github.com/elastic/kibana/issues/246592
  describe.skip('Global Settings', function () {
    skipIfNoDockerRegistry(providerContext);

    let agentPolicy: CreateAgentPolicyResponse;
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();

      agentPolicy = await apiClient.createAgentPolicy();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should respond return settings', async function () {
      await apiClient.getSettings();
    });

    it('should allow to save settings', async function () {
      await apiClient.putSettings({
        prerelease_integrations_enabled: true,
      });

      const updatedSettings = await apiClient.getSettings();
      expect(updatedSettings.item.prerelease_integrations_enabled).to.be(true);

      // it should not bump revision
      const updatedAgentPolicy = await apiClient.getAgentPolicy(agentPolicy.item.id);
      expect(updatedAgentPolicy.item.revision).to.be(agentPolicy.item.revision);
    });

    it('should reindex knowledge base when setting is enabled', async function () {
      await apiClient.installPackage({ pkgName: 'knowledge_base_test', pkgVersion: '1.0.0' });

      await apiClient.putSettings({
        integration_knowledge_enabled: true,
      });

      const updatedSettings = await apiClient.getSettings();
      expect(updatedSettings.item.integration_knowledge_enabled).to.be(true);

      await retry.tryForTime(10000, async () => {
        const response = await apiClient.getPackage({
          pkgName: 'knowledge_base_test',
          pkgVersion: '1.0.0',
        });
        expect(
          response.item.installationInfo?.installed_es.some(
            (esAsset) => esAsset.type === 'knowledge_base'
          )
        ).to.be(true);
      });
    });
  });
}
