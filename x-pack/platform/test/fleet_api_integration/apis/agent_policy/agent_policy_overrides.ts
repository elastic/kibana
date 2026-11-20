/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { INGEST_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

// An override the agent policy API has always accepted, and that the full agent policy schema allows.
const ALLOWED_OVERRIDES = { agent: { logging: { level: 'debug' } } };
// OpenTelemetry collector keys that `overrides` must not set.
const DENIED_OVERRIDES = {
  receivers: { otlp: {} },
  'extensions.pprof.save_to_file': '/tmp/pprof',
};

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('agent policy overrides', () => {
    skipIfNoDockerRegistry(providerContext);

    const createdPolicyIds: string[] = [];

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await fleetAndAgents.setup();
    });

    after(async () => {
      for (const agentPolicyId of createdPolicyIds) {
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId });
      }
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    async function createAgentPolicy(overrides?: Record<string, unknown>) {
      const { body } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `overrides-test-${Date.now()}-${Math.random()}`,
          namespace: 'default',
          overrides,
        })
        .expect(200);
      createdPolicyIds.push(body.item.id);
      return body.item;
    }

    // Writes `overrides` straight to the saved object, as a policy saved before the OpenTelemetry
    // collector keys were denied would have it. The API rejects them now, so it cannot be used.
    async function setStoredOverrides(agentPolicyId: string, overrides: Record<string, unknown>) {
      await es.update({
        index: INGEST_SAVED_OBJECT_INDEX,
        id: `fleet-agent-policies:${agentPolicyId}`,
        doc: { 'fleet-agent-policies': { overrides } },
        refresh: 'wait_for',
      });
    }

    describe('requests', () => {
      it('should reject OpenTelemetry collector keys when creating a policy', async () => {
        const { body } = await supertest
          .post('/api/fleet/agent_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `overrides-rejected-${Date.now()}`,
            namespace: 'default',
            overrides: { receivers: {} },
          })
          .expect(400);
        expect(body.message).to.contain('receivers overrides is not allowed');
      });

      it('should reject a dotted OpenTelemetry collector key when creating a policy', async () => {
        const { body } = await supertest
          .post('/api/fleet/agent_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `overrides-rejected-dotted-${Date.now()}`,
            namespace: 'default',
            overrides: { 'extensions.pprof.save_to_file': '/tmp/pprof' },
          })
          .expect(400);
        expect(body.message).to.contain('extensions overrides is not allowed');
      });

      it('should reject OpenTelemetry collector keys when updating a policy', async () => {
        const policy = await createAgentPolicy();
        const { body } = await supertest
          .put(`/api/fleet/agent_policies/${policy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: policy.name,
            namespace: 'default',
            overrides: { service: { pipelines: {} } },
          })
          .expect(400);
        expect(body.message).to.contain('service overrides is not allowed');
      });

      it('should still accept and deliver allowed overrides', async () => {
        const policy = await createAgentPolicy(ALLOWED_OVERRIDES);
        expect(policy.overrides).to.eql(ALLOWED_OVERRIDES);

        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${policy.id}/full`)
          .expect(200);
        expect(body.item.agent.logging.level).to.be('debug');
      });
    });

    describe('policies saved before OpenTelemetry collector keys were denied', () => {
      let policyId: string;
      let policyName: string;

      before(async () => {
        const policy = await createAgentPolicy(ALLOWED_OVERRIDES);
        policyId = policy.id;
        policyName = policy.name;
        await setStoredOverrides(policyId, { ...ALLOWED_OVERRIDES, ...DENIED_OVERRIDES });
      });

      it('should still be readable', async () => {
        const { body } = await supertest.get(`/api/fleet/agent_policies/${policyId}`).expect(200);
        expect(body.item.overrides).to.eql({ ...ALLOWED_OVERRIDES, ...DENIED_OVERRIDES });
      });

      it('should not deliver the denied keys to agents', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${policyId}/full`)
          .expect(200);
        expect(body.item).not.to.have.property('receivers');
        expect(body.item).not.to.have.property('extensions');
        expect(body.item).not.to.have.property('extensions.pprof.save_to_file');
        expect(body.item.agent.logging.level).to.be('debug');
      });

      it('should be copied without the denied keys', async () => {
        const { body } = await supertest
          .post(`/api/fleet/agent_policies/${policyId}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({ name: `${policyName}-copy` })
          .expect(200);
        createdPolicyIds.push(body.item.id);
        expect(body.item.overrides).to.eql(ALLOWED_OVERRIDES);
      });

      it('should still be updatable without sending overrides', async () => {
        const { body } = await supertest
          .put(`/api/fleet/agent_policies/${policyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ name: policyName, namespace: 'default', description: 'updated' })
          .expect(200);
        expect(body.item.description).to.be('updated');
      });
    });
  });
}
