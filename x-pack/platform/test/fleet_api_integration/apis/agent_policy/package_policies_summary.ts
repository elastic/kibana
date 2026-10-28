/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

const SUMMARY_ROUTE = '/internal/fleet/agent_policies/_package_policies_summary';

const AUDITD_INPUTS = [
  {
    type: 'audit/auditd',
    policy_template: 'auditd',
    enabled: true,
    streams: [
      {
        enabled: true,
        data_stream: { type: 'logs', dataset: 'auditd_manager.auditd' },
        vars: {
          socket_type: { value: '', type: 'select' },
          immutable: { value: false, type: 'bool' },
          resolve_ids: { value: true, type: 'bool' },
          failure_mode: { value: 'silent', type: 'text' },
          audit_rules: { type: 'textarea' },
          audit_rule_files: { type: 'text' },
          preserve_original_event: { value: false, type: 'bool' },
          backlog_limit: { value: 8192, type: 'text' },
          rate_limit: { value: 0, type: 'text' },
          include_warnings: { value: false, type: 'bool' },
          backpressure_strategy: { value: 'auto', type: 'text' },
          tags: { value: ['auditd_manager-auditd'], type: 'text' },
          processors: { type: 'yaml' },
        },
      },
    ],
  },
];

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const fleetAndAgents = getService('fleetAndAgents');

  const createAgentPolicy = async (): Promise<string> => {
    const {
      body: {
        item: { id },
      },
    } = await supertest
      .post('/api/fleet/agent_policies')
      .set('kbn-xsrf', 'xxxx')
      .send({ name: `Package policies summary ${uuidv4()}`, namespace: 'default' })
      .expect(200);
    return id;
  };

  // `auditd_manager` requires root privileges
  const createAuditdPackagePolicy = async (policyIds: string[]) => {
    await supertest
      .post('/api/fleet/package_policies')
      .set('kbn-xsrf', 'xxxx')
      .send({
        name: `auditd-${uuidv4()}`,
        description: '',
        namespace: 'default',
        policy_ids: policyIds,
        package: { name: 'auditd_manager', version: '1.16.3' },
        inputs: AUDITD_INPUTS,
      })
      .expect(200);
  };

  const getSummaries = (ids: string[]) =>
    supertest
      .post(SUMMARY_ROUTE)
      .set('kbn-xsrf', 'xxxx')
      .set('elastic-api-version', '1')
      .send({ ids });

  describe('agent policies package policies summary', () => {
    skipIfNoDockerRegistry(providerContext);

    const agentPolicyIds: string[] = [];
    let emptyPolicyId: string;
    let rootPolicyId: string;
    let sharedPolicyId1: string;
    let sharedPolicyId2: string;

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await fleetAndAgents.setup();
      await supertest
        .post('/api/fleet/epm/packages/auditd_manager/1.16.3')
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      emptyPolicyId = await createAgentPolicy();
      rootPolicyId = await createAgentPolicy();
      sharedPolicyId1 = await createAgentPolicy();
      sharedPolicyId2 = await createAgentPolicy();
      agentPolicyIds.push(emptyPolicyId, rootPolicyId, sharedPolicyId1, sharedPolicyId2);

      await createAuditdPackagePolicy([rootPolicyId]);
      await createAuditdPackagePolicy([rootPolicyId]);
      await createAuditdPackagePolicy([sharedPolicyId1, sharedPolicyId2]);
    });

    after(async () => {
      for (const agentPolicyId of agentPolicyIds) {
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
      }
      await supertest
        .delete('/api/fleet/epm/packages/auditd_manager/1.16.3')
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    it('should return an empty summary for an agent policy without package policies', async () => {
      const { body } = await getSummaries([emptyPolicyId]).expect(200);

      expect(body.items[emptyPolicyId]).to.eql({
        count: 0,
        has_fleet_server: false,
        has_managed: false,
        has_root_integrations: false,
        has_shared: false,
      });
    });

    it('should count the package policies and flag the root integrations', async () => {
      const { body } = await getSummaries([rootPolicyId]).expect(200);

      expect(body.items[rootPolicyId]).to.eql({
        count: 2,
        has_fleet_server: false,
        has_managed: false,
        has_root_integrations: true,
        has_shared: false,
      });
    });

    it('should flag the package policies shared with other agent policies', async () => {
      const { body } = await getSummaries([sharedPolicyId1, sharedPolicyId2, rootPolicyId]).expect(
        200
      );

      expect(body.items[sharedPolicyId1].has_shared).to.be(true);
      expect(body.items[sharedPolicyId2].has_shared).to.be(true);
      expect(body.items[sharedPolicyId1].count).to.be(1);
      expect(body.items[sharedPolicyId2].count).to.be(1);
      expect(body.items[rootPolicyId].has_shared).to.be(false);
    });

    it('should deduplicate the ids and return an empty summary for unknown agent policies', async () => {
      const { body } = await getSummaries([emptyPolicyId, emptyPolicyId, 'unknown-policy']).expect(
        200
      );

      expect(Object.keys(body.items).sort()).to.eql([emptyPolicyId, 'unknown-policy'].sort());
      expect(body.items['unknown-policy'].count).to.be(0);
    });

    it('should reject an empty list of ids', async () => {
      await getSummaries([]).expect(400);
    });

    it('should reject more than 100 ids', async () => {
      await getSummaries(Array.from({ length: 101 }, (_, i) => `policy-${i}`)).expect(400);
    });
  });
}
