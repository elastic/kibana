/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { skipIfNoDockerRegistry } from '../../helpers';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const epmInstall = async (pkgName: string, pkgVersion: string) => {
    const getPkgRes = await supertest
      .post(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
    return getPkgRes;
  };

  describe('fleet_agent_policies_min_agent_version', () => {
    skipIfNoDockerRegistry(providerContext);

    let policyWithoutPPId: string;
    let policyWithNoVersionConditionId: string;
    let policyWithVersionConditionId: string;
    let policyWithMultipleVersionConditionsId: string;

    before(async () => {
      // Not strictly necessary, but allows automatic cleanup.
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/agents');

      await epmInstall('agent_version_test', '1.0.0');
      await epmInstall('single_input_no_streams', '0.1.0');

      // Create agent policy without package policies
      const { body: policyWithoutPP } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Policy without package policies',
          namespace: 'default',
        })
        .expect(200);
      policyWithoutPPId = policyWithoutPP.item.id;

      // Create agent policy with package policy that has no agent version condition
      const { body: policyWithNoVersionCondition } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Policy with no version condition',
          namespace: 'default',
        })
        .expect(200);
      policyWithNoVersionConditionId = policyWithNoVersionCondition.item.id;

      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'single-input-1',
          description: '',
          namespace: 'default',
          policy_id: policyWithNoVersionConditionId,
          enabled: true,
          inputs: [
            {
              enabled: true,
              streams: [],
              type: 'single_input',
            },
          ],
          package: {
            name: 'single_input_no_streams',
            version: '0.1.0',
          },
        })
        .expect(200);

      // Create agent policy with package policy that has agent version condition
      const { body: policyWithVersionCondition } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Policy with version condition',
          namespace: 'default',
        })
        .expect(200);
      policyWithVersionConditionId = policyWithVersionCondition.item.id;

      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'agent-version-test-1',
          description: '',
          namespace: 'default',
          policy_id: policyWithVersionConditionId,
          enabled: true,
          inputs: [
            {
              enabled: true,
              streams: [],
              type: 'single_input',
            },
          ],
          package: {
            name: 'agent_version_test',
            version: '1.0.0',
          },
        })
        .expect(200);

      // Create agent policy with multiple package policies with different version requirements
      await epmInstall('agent_version_test', '1.1.0');
      const { body: policyWithMultipleVersionConditions } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Policy with multiple version conditions',
          namespace: 'default',
        })
        .expect(200);
      policyWithMultipleVersionConditionsId = policyWithMultipleVersionConditions.item.id;

      // Add first package policy with version 8.12.0
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'agent-version-test-1-8.12',
          description: '',
          namespace: 'default',
          policy_id: policyWithMultipleVersionConditionsId,
          enabled: true,
          inputs: [
            {
              enabled: true,
              streams: [],
              type: 'single_input',
            },
          ],
          package: {
            name: 'agent_version_test',
            version: '1.0.0',
          },
        })
        .expect(200);

      // Add second package policy with version 8.13.0
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'agent-version-test-1-8.13',
          description: '',
          namespace: 'default',
          policy_id: policyWithMultipleVersionConditionsId,
          enabled: true,
          inputs: [
            {
              enabled: true,
              streams: [],
              type: 'single_input',
            },
          ],
          package: {
            name: 'agent_version_test',
            version: '1.1.0',
          },
        })
        .expect(200);
    });

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/agents');
    });

    describe('GET /api/fleet/agent_policies/{id}', () => {
      it('should not populate min_agent_version when agent policy has no package policies', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${policyWithoutPPId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body.item.min_agent_version).to.be(undefined);
      });

      it('should not populate min_agent_version when package policies have no agent version condition', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${policyWithNoVersionConditionId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        expect(body.item.min_agent_version).to.be(undefined);
      });

      it('should populate min_agent_version when package policy has agent version condition', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${policyWithVersionConditionId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body.item.min_agent_version).to.be('8.12.0');
      });

      it('should return highest version when multiple package policies have different agent version requirements', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${policyWithMultipleVersionConditionsId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body.item.min_agent_version).to.be('8.13.0');
      });
    });

    describe('GET /api/fleet/agent_policies', () => {
      it('should not populate min_agent_version when full=false', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const policy = body.items.find((p: any) => p.id === policyWithVersionConditionId);
        if (policy) {
          expect(policy.min_agent_version).to.be(undefined);
        }
      });

      it('should populate min_agent_version when full=true and package policies have agent version conditions', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies?full=true`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const policyWithoutPP = body.items.find((p: any) => p.id === policyWithoutPPId);
        expect(policyWithoutPP?.min_agent_version).to.be(undefined);

        const policyWithNoVersion = body.items.find(
          (p: any) => p.id === policyWithNoVersionConditionId
        );
        expect(policyWithNoVersion?.min_agent_version).to.be(undefined);

        const policyWithVersion = body.items.find(
          (p: any) => p.id === policyWithVersionConditionId
        );
        expect(policyWithVersion?.min_agent_version).to.be('8.12.0');
      });

      it('should populate min_agent_version with full=true and simplified format', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies?full=true&format=simplified`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const policyWithVersion = body.items.find(
          (p: any) => p.id === policyWithVersionConditionId
        );
        expect(policyWithVersion?.min_agent_version).to.be('8.12.0');
      });
    });

    describe('POST /api/fleet/agent_policies/_bulk_get', () => {
      it('should not populate min_agent_version when full=false', async () => {
        const { body } = await supertest
          .post(`/api/fleet/agent_policies/_bulk_get`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ids: [policyWithVersionConditionId],
          })
          .expect(200);

        expect(body.items[0].min_agent_version).to.be(undefined);
      });

      it('should populate min_agent_version when full=true and package policies have agent version conditions', async () => {
        const { body } = await supertest
          .post(`/api/fleet/agent_policies/_bulk_get`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ids: [
              policyWithoutPPId,
              policyWithNoVersionConditionId,
              policyWithVersionConditionId,
              policyWithMultipleVersionConditionsId,
            ],
            full: true,
          })
          .expect(200);

        const policyWithoutPP = body.items.find((p: any) => p.id === policyWithoutPPId);
        expect(policyWithoutPP?.min_agent_version).to.be(undefined);

        const policyWithNoVersion = body.items.find(
          (p: any) => p.id === policyWithNoVersionConditionId
        );
        expect(policyWithNoVersion?.min_agent_version).to.be(undefined);

        const policyWithVersion = body.items.find(
          (p: any) => p.id === policyWithVersionConditionId
        );
        expect(policyWithVersion?.min_agent_version).to.be('8.12.0');

        const policyWithMultiple = body.items.find(
          (p: any) => p.id === policyWithMultipleVersionConditionsId
        );
        // Should return highest version (8.13.0)
        expect(policyWithMultiple?.min_agent_version).to.be('8.13.0');
      });

      it('should populate min_agent_version when full=true with simplified format', async () => {
        const { body } = await supertest
          .post(`/api/fleet/agent_policies/_bulk_get?format=simplified`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ids: [policyWithVersionConditionId],
            full: true,
          })
          .expect(200);

        expect(body.items[0].min_agent_version).to.be('8.12.0');
      });
    });
  });
}
