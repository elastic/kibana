/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Integration tests for per-integration OTel output overrides in Fleet agent policies.
 *
 * - When an OTel package policy has output_id set, the generated OTel config must route
 *   that integration's streams through the override output (separate elasticsearch/<id>
 *   exporter, forward/<id> connector, and <signal>/<id> fan-in pipeline).
 * - Attempting to set a non-ES (e.g. Logstash) output_id on an OTel package policy must
 *   be rejected with a 400.
 * - A policy mixing OTel integrations with and without overrides must contain routing paths
 *   for both the default output and the override output.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

const DYNAMIC_PKG = 'test_otel_dynamic';
const DYNAMIC_PKG_VERSION = '1.0.0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('OTel per-integration output overrides in full agent policy', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await fleetAndAgents.setup();

      await supertest
        .post(`/api/fleet/epm/packages/${DYNAMIC_PKG}/${DYNAMIC_PKG_VERSION}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    });

    after(async () => {
      await supertest
        .delete(`/api/fleet/epm/packages/${DYNAMIC_PKG}/${DYNAMIC_PKG_VERSION}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true });

      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    async function createEsOutput(name?: string): Promise<string> {
      const { body } = await supertest
        .post('/api/fleet/outputs')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: name ?? `otel-override-output-${uuidv4()}`,
          type: 'elasticsearch',
          hosts: ['https://override-es.example.com:9200'],
          is_default: false,
          is_default_monitoring: false,
        })
        .expect(200);
      return body.item.id;
    }

    async function createLogstashOutput(): Promise<string> {
      const { body } = await supertest
        .post('/api/fleet/outputs')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `logstash-output-${uuidv4()}`,
          type: 'logstash',
          hosts: ['logstash.example.com:5044'],
          is_default: false,
          is_default_monitoring: false,
        })
        .expect(200);
      return body.item.id;
    }

    async function deleteOutput(outputId: string) {
      await supertest
        .delete(`/api/fleet/outputs/${outputId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true });
    }

    async function createAgentPolicy(): Promise<string> {
      const {
        body: {
          item: { id },
        },
      } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({ name: `otel-overrides-test-${uuidv4()}`, namespace: 'default' })
        .expect(200);
      return id;
    }

    async function deleteAgentPolicy(agentPolicyId: string) {
      await supertest
        .post('/api/fleet/agent_policies/delete')
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId });
    }

    async function postOtelPackagePolicy(
      agentPolicyId: string,
      outputId: string | undefined,
      expectStatus: 200 | 400
    ) {
      const payload: Record<string, unknown> = {
        name: `otel-pkg-policy-${uuidv4()}`,
        namespace: 'default',
        policy_id: agentPolicyId,
        package: { name: DYNAMIC_PKG, version: DYNAMIC_PKG_VERSION },
        inputs: {
          'otlpreceiver-otelcol': {
            enabled: true,
            streams: {
              'test_otel_dynamic.otlpreceiver': { enabled: true, vars: {} },
            },
          },
        },
      };
      if (outputId !== undefined) {
        payload.output_id = outputId;
      }
      await supertest
        .post('/api/fleet/package_policies')
        .set('kbn-xsrf', 'xxxx')
        .send(payload)
        .expect(expectStatus);
    }

    async function getFullAgentPolicy(agentPolicyId: string): Promise<Record<string, any>> {
      const { body } = await supertest
        .get(`/api/fleet/agent_policies/${agentPolicyId}/full`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      return body.item;
    }

    // -------------------------------------------------------------------------
    // Test 1: override ES output → routed through override exporter/connector/fan-in
    // -------------------------------------------------------------------------
    it('routes streams through the override ES output when package policy has output_id', async () => {
      const overrideOutputId = await createEsOutput();
      const agentPolicyId = await createAgentPolicy();

      try {
        await postOtelPackagePolicy(agentPolicyId, overrideOutputId, 200);
        const fullPolicy = await getFullAgentPolicy(agentPolicyId);

        // OTel config is spread at the root of the full agent policy.
        expect(fullPolicy.connectors?.[`forward/${overrideOutputId}`]).to.eql({});
        expect(fullPolicy.exporters?.[`elasticsearch/${overrideOutputId}`]).to.be.ok();

        // A fan-in pipeline must exist for the override; at least one per-stream pipeline must
        // export to forward/<overrideOutputId>.
        const pipelines = fullPolicy.service?.pipelines ?? {};
        const overrideFanInKeys = Object.keys(pipelines).filter((k) =>
          k.endsWith(`/${overrideOutputId}`)
        );
        expect(overrideFanInKeys.length).to.be.greaterThan(0);

        const streamPipelinesRoutingToOverride = Object.values(pipelines).filter((pipeline: any) =>
          (pipeline.exporters ?? []).includes(`forward/${overrideOutputId}`)
        );
        expect(streamPipelinesRoutingToOverride.length).to.be.greaterThan(0);
      } finally {
        await deleteAgentPolicy(agentPolicyId);
        await deleteOutput(overrideOutputId);
      }
    });

    // -------------------------------------------------------------------------
    // Test 2: Logstash output_id on an OTel package policy → rejected with 400
    // -------------------------------------------------------------------------
    it('rejects a Logstash output_id on an OTel package policy with a 400 error', async () => {
      const logstashOutputId = await createLogstashOutput();
      const agentPolicyId = await createAgentPolicy();

      try {
        await postOtelPackagePolicy(agentPolicyId, logstashOutputId, 400);
      } finally {
        await deleteAgentPolicy(agentPolicyId);
        await deleteOutput(logstashOutputId);
      }
    });

    // -------------------------------------------------------------------------
    // Test 3: mixed policy — one OTel pkg with override, one without → two routing paths
    // -------------------------------------------------------------------------
    it('generates routing paths for both override and default output in a mixed policy', async () => {
      const overrideOutputId = await createEsOutput();
      const agentPolicyId = await createAgentPolicy();

      try {
        await postOtelPackagePolicy(agentPolicyId, overrideOutputId, 200);
        await postOtelPackagePolicy(agentPolicyId, undefined, 200);

        const fullPolicy = await getFullAgentPolicy(agentPolicyId);

        // Both an override forward connector and a default forward connector must be present.
        expect(fullPolicy.connectors?.[`forward/${overrideOutputId}`]).to.eql({});
        expect(fullPolicy.connectors?.['forward/default']).to.eql({});
        expect(fullPolicy.exporters?.[`elasticsearch/${overrideOutputId}`]).to.be.ok();
        expect(fullPolicy.exporters?.['elasticsearch/default']).to.be.ok();
      } finally {
        await deleteAgentPolicy(agentPolicyId);
        await deleteOutput(overrideOutputId);
      }
    });
  });
}
