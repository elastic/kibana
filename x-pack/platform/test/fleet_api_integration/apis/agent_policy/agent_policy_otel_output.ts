/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Integration tests for OTel exporter / beatsauth extension generation in full agent policies.
 *
 * Covers elastic/kibana#262880:
 * - SSL/proxy/transport parameters specified via the output's Advanced YAML (config_yaml) must
 *   be forwarded to the generated beatsauth extension.
 * - Structured output fields (ssl.*, ca_trusted_fingerprint, proxy) take precedence over config_yaml.
 * - otel_disable_beatsauth=true must omit the beatsauth extension and auth key from the exporter.
 * - otel_exporter_config_yaml is still merged into the exporter even when beatsauth is disabled.
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

  describe('OTel exporter / beatsauth generation in full agent policy', () => {
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

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    async function createOutput(fields: Record<string, unknown>): Promise<string> {
      const { body } = await supertest
        .post('/api/fleet/outputs')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `otel-output-test-${uuidv4()}`,
          type: 'elasticsearch',
          hosts: ['https://es.example.com:9200'],
          is_default: false,
          is_default_monitoring: false,
          ...fields,
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

    async function createAgentPolicyWithOutput(outputId: string): Promise<string> {
      const {
        body: {
          item: { id },
        },
      } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `otel-output-policy-${uuidv4()}`,
          namespace: 'default',
          data_output_id: outputId,
        })
        .expect(200);
      return id;
    }

    async function deleteAgentPolicy(agentPolicyId: string) {
      await supertest
        .post('/api/fleet/agent_policies/delete')
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId });
    }

    async function addOtelPackagePolicy(agentPolicyId: string) {
      await supertest
        .post('/api/fleet/package_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `otel-pkg-${uuidv4()}`,
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
        })
        .expect(200);
    }

    async function getFullAgentPolicy(agentPolicyId: string): Promise<Record<string, any>> {
      const { body } = await supertest
        .get(`/api/fleet/agent_policies/${agentPolicyId}/full`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      return body.item;
    }

    /** Return the beatsauth extension for the given output ID (e.g. "default"). */
    function getBeatsauthExtension(
      fullPolicy: Record<string, any>,
      outputId: string
    ): Record<string, any> | undefined {
      return fullPolicy.extensions?.[`beatsauth/${outputId}`];
    }

    /** Return the elasticsearch exporter for the given output ID. */
    function getEsExporter(
      fullPolicy: Record<string, any>,
      outputId: string
    ): Record<string, any> | undefined {
      return fullPolicy.exporters?.[`elasticsearch/${outputId}`];
    }

    // -----------------------------------------------------------------------
    // Test 1: ssl params from config_yaml appear in beatsauth extension
    // -----------------------------------------------------------------------
    it('includes ssl parameters from config_yaml in the beatsauth extension', async () => {
      const outputId = await createOutput({
        config_yaml:
          'ssl:\n  certificate_authorities:\n    - /path/to/ca.crt\n  verification_mode: none',
      });

      const agentPolicyId = await createAgentPolicyWithOutput(outputId);

      try {
        await addOtelPackagePolicy(agentPolicyId);
        const fullPolicy = await getFullAgentPolicy(agentPolicyId);

        const beatsauth = getBeatsauthExtension(fullPolicy, outputId);
        expect(beatsauth).not.to.be(undefined);
        expect(beatsauth!.ssl).to.eql({
          certificate_authorities: ['/path/to/ca.crt'],
          verification_mode: 'none',
        });
      } finally {
        await deleteAgentPolicy(agentPolicyId);
        await deleteOutput(outputId);
      }
    });

    // -----------------------------------------------------------------------
    // Test 2: timeout / idle_connection_timeout from config_yaml appear in beatsauth
    // -----------------------------------------------------------------------
    it('includes timeout and idle_connection_timeout from config_yaml in the beatsauth extension', async () => {
      const outputId = await createOutput({
        config_yaml: 'timeout: 30s\nidle_connection_timeout: 5s',
      });

      const agentPolicyId = await createAgentPolicyWithOutput(outputId);

      try {
        await addOtelPackagePolicy(agentPolicyId);
        const fullPolicy = await getFullAgentPolicy(agentPolicyId);

        const beatsauth = getBeatsauthExtension(fullPolicy, outputId);
        expect(beatsauth).not.to.be(undefined);
        expect(beatsauth!.timeout).to.be('30s');
        expect(beatsauth!.idle_connection_timeout).to.be('5s');
      } finally {
        await deleteAgentPolicy(agentPolicyId);
        await deleteOutput(outputId);
      }
    });

    // -----------------------------------------------------------------------
    // Test 3: structured ssl fields take precedence over config_yaml
    // -----------------------------------------------------------------------
    it('structured ssl fields take precedence over config_yaml values in beatsauth', async () => {
      const outputId = await createOutput({
        // config_yaml sets verification_mode to none — structured field should override to full
        config_yaml:
          'ssl:\n  verification_mode: none\n  certificate_authorities:\n    - /yaml/ca.crt',
        ssl: {
          certificate_authorities: ['-----BEGIN CERTIFICATE-----\nSTRUCTURED'],
          verification_mode: 'full',
        },
      });

      const agentPolicyId = await createAgentPolicyWithOutput(outputId);

      try {
        await addOtelPackagePolicy(agentPolicyId);
        const fullPolicy = await getFullAgentPolicy(agentPolicyId);

        const beatsauth = getBeatsauthExtension(fullPolicy, outputId);
        expect(beatsauth).not.to.be(undefined);
        expect(beatsauth!.ssl.verification_mode).to.be('full');
        expect(beatsauth!.ssl.certificate_authorities).to.eql([
          '-----BEGIN CERTIFICATE-----\nSTRUCTURED',
        ]);
      } finally {
        await deleteAgentPolicy(agentPolicyId);
        await deleteOutput(outputId);
      }
    });

    // -----------------------------------------------------------------------
    // Test 4: otel_disable_beatsauth=true — no beatsauth extension, no auth in exporter
    // -----------------------------------------------------------------------
    it('omits beatsauth extension and exporter auth when otel_disable_beatsauth is true', async () => {
      const outputId = await createOutput({
        otel_disable_beatsauth: true,
        ssl: {
          certificate_authorities: ['-----BEGIN CERTIFICATE-----\nMIIC...'],
          verification_mode: 'full',
        },
      });

      const agentPolicyId = await createAgentPolicyWithOutput(outputId);

      try {
        await addOtelPackagePolicy(agentPolicyId);
        const fullPolicy = await getFullAgentPolicy(agentPolicyId);

        expect(getBeatsauthExtension(fullPolicy, outputId)).to.be(undefined);
        const exporter = getEsExporter(fullPolicy, outputId);
        expect(exporter).not.to.be(undefined);
        expect(exporter!).not.to.have.property('auth');
        expect(exporter!.endpoints).to.eql(['https://es.example.com:9200']);
      } finally {
        await deleteAgentPolicy(agentPolicyId);
        await deleteOutput(outputId);
      }
    });

    // -----------------------------------------------------------------------
    // Test 5: otel_disable_beatsauth=true — otel_exporter_config_yaml still merged
    // -----------------------------------------------------------------------
    it('still merges otel_exporter_config_yaml into the exporter when otel_disable_beatsauth is true', async () => {
      const outputId = await createOutput({
        otel_disable_beatsauth: true,
        otel_exporter_config_yaml: 'flush_interval: 5s',
      });

      const agentPolicyId = await createAgentPolicyWithOutput(outputId);

      try {
        await addOtelPackagePolicy(agentPolicyId);
        const fullPolicy = await getFullAgentPolicy(agentPolicyId);

        expect(getBeatsauthExtension(fullPolicy, outputId)).to.be(undefined);
        const exporter = getEsExporter(fullPolicy, outputId);
        expect(exporter).not.to.be(undefined);
        expect(exporter!.flush_interval).to.be('5s');
        expect(exporter!.endpoints).to.eql(['https://es.example.com:9200']);
      } finally {
        await deleteAgentPolicy(agentPolicyId);
        await deleteOutput(outputId);
      }
    });

    // -----------------------------------------------------------------------
    // Test 6: otel_disable_beatsauth=false (explicit) — beatsauth is still generated
    // -----------------------------------------------------------------------
    it('generates beatsauth normally when otel_disable_beatsauth is false', async () => {
      const outputId = await createOutput({
        otel_disable_beatsauth: false,
        ssl: {
          certificate_authorities: ['-----BEGIN CERTIFICATE-----\nMIIC...'],
        },
      });

      const agentPolicyId = await createAgentPolicyWithOutput(outputId);

      try {
        await addOtelPackagePolicy(agentPolicyId);
        const fullPolicy = await getFullAgentPolicy(agentPolicyId);

        const beatsauth = getBeatsauthExtension(fullPolicy, outputId);
        expect(beatsauth).not.to.be(undefined);
        const exporter = getEsExporter(fullPolicy, outputId);
        expect(exporter!.auth).to.eql({ authenticator: `beatsauth/${outputId}` });
      } finally {
        await deleteAgentPolicy(agentPolicyId);
        await deleteOutput(outputId);
      }
    });
  });
}
