/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { uninstallTokensRouteService } from '@kbn/fleet-plugin/common/services';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { testUsers } from '../test_users';
import { generateAgentPolicy } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('Rotate Uninstall Token API', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('POST /api/fleet/uninstall_tokens/{agentPolicyId}/rotate', () => {
      it('should return 400 when the agent policy does not have tamper protection enabled', async () => {
        const agentPolicy = await generateAgentPolicy(supertest, { is_protected: false });

        const response = await supertest
          .post(uninstallTokensRouteService.getRotatePath(agentPolicy.id))
          .set('kbn-xsrf', 'xxxx')
          .expect(400);

        expect(response.body.message).to.contain('does not have tamper protection enabled');
      });

      it('should return 404 when the agent policy does not exist', async () => {
        const response = await supertest
          .post(uninstallTokensRouteService.getRotatePath('non-existent-policy-id'))
          .set('kbn-xsrf', 'xxxx')
          .expect(404);

        expect(response.body.message).to.contain('Agent policy not found');
      });

      it('should rotate the uninstall token for a protected policy', async () => {
        const agentPolicy = await generateAgentPolicy(supertest, { is_protected: true });

        const firstTokenResponse = await supertest
          .get(uninstallTokensRouteService.getListPath())
          .query({ policyId: agentPolicy.id })
          .expect(200);

        expect(firstTokenResponse.body.total).to.equal(1);
        const firstTokenId = firstTokenResponse.body.items[0].id;

        await supertest
          .post(uninstallTokensRouteService.getRotatePath(agentPolicy.id))
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const secondTokenResponse = await supertest
          .get(uninstallTokensRouteService.getListPath())
          .query({ policyId: agentPolicy.id })
          .expect(200);

        expect(secondTokenResponse.body.total).to.equal(1);
        const secondTokenId = secondTokenResponse.body.items[0].id;

        expect(secondTokenId).not.to.equal(firstTokenId);
      });

      it('should return a success message', async () => {
        const agentPolicy = await generateAgentPolicy(supertest, { is_protected: true });

        const response = await supertest
          .post(uninstallTokensRouteService.getRotatePath(agentPolicy.id))
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(response.body).to.have.property('message', 'Uninstall token rotated successfully.');
      });
    });

    describe('privilege enforcement for POST rotate', () => {
      let protectedPolicyId: string;

      before(async () => {
        const agentPolicy = await generateAgentPolicy(supertest, { is_protected: true });
        protectedPolicyId = agentPolicy.id;
      });

      const PRIVILEGE_SCENARIOS = [
        { user: testUsers.fleet_all_only, statusCode: 200 },
        { user: testUsers.fleet_agents_all_only, statusCode: 200 },
        { user: testUsers.fleet_agents_read_only, statusCode: 403 },
        { user: testUsers.fleet_read_only, statusCode: 403 },
        { user: testUsers.fleet_no_access, statusCode: 403 },
        { user: testUsers.fleet_minimal_all_only, statusCode: 403 },
        { user: testUsers.fleet_minimal_read_only, statusCode: 403 },
        { user: testUsers.fleet_settings_read_only, statusCode: 403 },
      ];

      for (const { user, statusCode } of PRIVILEGE_SCENARIOS) {
        it(`should return ${statusCode} for user ${user.username}`, async () => {
          await supertestWithoutAuth
            .post(uninstallTokensRouteService.getRotatePath(protectedPolicyId))
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'xxxx')
            .expect(statusCode);
        });
      }
    });
  });
}
