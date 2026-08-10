/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * API integration tests for the OTLP output type (managedOtlpOutput feature flag).
 *
 * These tests live in the managed_inputs suite because `config.managed_inputs.ts` already
 * provisions `xpack.cloud.managed_otlp.url` and the managed-bulk infrastructure, and its
 * comment anticipated this addition. Enabling `managedOtlpOutput` only in this config keeps
 * the flag scoped to where it is meaningful.
 *
 * Coverage:
 *   - Create: grpc happy path, http/protobuf with optional fields, protocol-validation 400s,
 *     secret round-trip (tls.key_pem and tls.tpm.owner_auth/auth via .fleet-secrets).
 *   - Update: otlp_exporter update, ES→OTLP type change, OTLP→ES type change.
 *   - Delete: ESO secrets are removed when the output is deleted (key_pem and tpm credentials).
 *   - Policy gating: pure-OTel policy accepted, mixed OTel+beats policy rejected.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { GLOBAL_SETTINGS_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common/constants';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { cleanFleetIndices } from '../space_awareness/helpers';

const DYNAMIC_PKG = 'test_otel_dynamic';
const DYNAMIC_PKG_VERSION = '1.0.0';

export default function (providerContext: FtrProviderContext) {
  describe('OTLP output', () => {
    const { getService } = providerContext;
    const supertest = getService('supertest');
    const es = getService('es');
    const kibanaServer = getService('kibanaServer');

    skipIfNoDockerRegistry(providerContext);

    const getSecretById = (id: string) =>
      es.get({
        index: '.fleet-secrets',
        id,
      });

    const deleteAllSecrets = async () => {
      try {
        await es.deleteByQuery({
          index: '.fleet-secrets',
          query: { match_all: {} },
        });
      } catch (_err) {
        // index doesn't exist yet — safe to ignore
      }
    };

    const enableOutputSecrets = async () => {
      await kibanaServer.savedObjects.create({
        type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
        id: 'fleet-default-settings',
        attributes: {
          output_secret_storage_requirements_met: true,
          use_space_awareness_migration_status: 'success',
        },
        overwrite: true,
      });
    };

    beforeEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
      await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'xxxx').send({}).expect(200);
      await enableOutputSecrets();
      await deleteAllSecrets();
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
      await deleteAllSecrets();
    });

    describe('POST /api/fleet/outputs', () => {
      it('creates a grpc OTLP output and round-trips the entire item', async () => {
        const name = `otlp-grpc-${uuidv4()}`;
        const { body } = await supertest
          .post('/api/fleet/outputs')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name,
            type: 'otlp',
            otlp_exporter: {
              endpoint: 'https://otlp.example.com:4317',
              protocol: 'grpc',
            },
          })
          .expect(200);

        const { id: _, ...itemWithoutId } = body.item;
        expect(itemWithoutId).to.eql({
          name,
          type: 'otlp',
          is_default: false,
          is_default_monitoring: false,
          otlp_exporter: {
            endpoint: 'https://otlp.example.com:4317',
            protocol: 'grpc',
          },
        });
      });

      it('creates a fully-populated http/protobuf OTLP output and round-trips all attributes', async () => {
        // Exercises every optional sub-block that is valid for http/protobuf in one payload.
        // grpc-only compression values (snappy, zstd) are excluded — the schema only allows
        // gzip/none for http/protobuf (OtlpHttpExporterSchema).
        // tls.key_pem is exercised in the dedicated secrets test below.
        const name = `otlp-http-full-${uuidv4()}`;
        const otlpExporter = {
          endpoint: 'https://otlp.example.com:4318',
          protocol: 'http/protobuf',
          compression: 'gzip',
          timeout: '30s',
          headers: { 'X-Custom-Header': 'test-value' },
          tls: {
            insecure: false,
            insecure_skip_verify: true,
            ca_pem: 'test-ca-pem',
            cert_pem: 'test-cert-pem',
            key_pem: 'test-key-pem',
            include_system_ca_certs_pool: true,
            min_version: 'TLS 1.2',
            max_version: 'TLS 1.3',
            reload_interval: '10s',
          },
          sending_queue: {
            enabled: true,
            num_consumers: 10,
            queue_size: 5000,
            sizer: 'requests',
            wait_for_result: true,
            block_on_overflow: false,
          },
          retry_on_failure: {
            enabled: true,
            initial_interval: '5s',
            max_interval: '30s',
            max_elapsed_time: '300s',
            multiplier: 1.5,
          },
          encoding: 'proto',
          traces_endpoint: '/v1/traces',
          metrics_endpoint: '/v1/metrics',
          logs_endpoint: '/v1/logs',
          profiles_endpoint: '/v1/profiles',
          read_buffer_size: 4096,
          write_buffer_size: 4096,
        };

        const { body } = await supertest
          .post('/api/fleet/outputs')
          .set('kbn-xsrf', 'xxxx')
          .send({ name, type: 'otlp', otlp_exporter: otlpExporter })
          .expect(200);

        const { id: _, ...itemWithoutId } = body.item;
        expect(itemWithoutId).to.eql({
          name,
          type: 'otlp',
          is_default: false,
          is_default_monitoring: false,
          otlp_exporter: otlpExporter,
        });
      });

      it('returns 400 when grpc protocol is combined with http-only fields', async () => {
        const { body } = await supertest
          .post('/api/fleet/outputs')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `otlp-invalid-${uuidv4()}`,
            type: 'otlp',
            otlp_exporter: {
              endpoint: 'https://otlp.example.com:4317',
              protocol: 'grpc',
              http: { encoding: 'proto' },
            },
          })
          .expect(400);

        expect(body.message).to.contain('[request body.otlp_exporter.http]');
      });

      it('returns 400 when http/protobuf protocol is combined with grpc-only compression', async () => {
        const { body } = await supertest
          .post('/api/fleet/outputs')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `otlp-invalid-${uuidv4()}`,
            type: 'otlp',
            otlp_exporter: {
              endpoint: 'https://otlp.example.com:4318',
              protocol: 'http/protobuf',
              compression: 'zstd',
            },
          })
          .expect(400);

        expect(body.message).to.contain('[request body.otlp_exporter.compression]');
      });

      it('stores tls secrets as ESO secret refs and returns them on GET', async () => {
        const { body } = await supertest
          .post('/api/fleet/outputs')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `otlp-secrets-${uuidv4()}`,
            type: 'otlp',
            otlp_exporter: {
              endpoint: 'https://otlp.example.com:4317',
              protocol: 'grpc',
            },
            secrets: {
              otlp_exporter: {
                tls: {
                  key_pem: 'test-tls-key-pem-value',
                  tpm: {
                    owner_auth: 'test-tpm-owner-auth-value',
                    auth: 'test-tpm-auth-value',
                  },
                },
              },
            },
          })
          .expect(200);

        const { item } = body;
        const tlsKeyPemSecretId: string = item.secrets?.otlp_exporter?.tls?.key_pem?.id;
        const ownerAuthSecretId: string = item.secrets?.otlp_exporter?.tls?.tpm?.owner_auth?.id;
        const authSecretId: string = item.secrets?.otlp_exporter?.tls?.tpm?.auth?.id;

        expect(tlsKeyPemSecretId).to.be.a('string');
        expect(ownerAuthSecretId).to.be.a('string');
        expect(authSecretId).to.be.a('string');

        const tlsKeyPemSecret = await getSecretById(tlsKeyPemSecretId);
        expect((tlsKeyPemSecret._source as Record<string, string>).value).to.be(
          'test-tls-key-pem-value'
        );

        const ownerAuthSecret = await getSecretById(ownerAuthSecretId);
        expect((ownerAuthSecret._source as Record<string, string>).value).to.be(
          'test-tpm-owner-auth-value'
        );

        const authSecret = await getSecretById(authSecretId);
        expect((authSecret._source as Record<string, string>).value).to.be('test-tpm-auth-value');
      });
    });

    describe('PUT /api/fleet/outputs/{id}', () => {
      it('updates the otlp_exporter on an existing OTLP output', async () => {
        const { body: createBody } = await supertest
          .post('/api/fleet/outputs')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `otlp-update-${uuidv4()}`,
            type: 'otlp',
            otlp_exporter: { endpoint: 'https://otlp.example.com:4317', protocol: 'grpc' },
          })
          .expect(200);

        const { id } = createBody.item;
        const newExporter = { endpoint: 'https://otlp-v2.example.com:4317', protocol: 'grpc' };

        const { body: updateBody } = await supertest
          .put(`/api/fleet/outputs/${id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ otlp_exporter: newExporter })
          .expect(200);

        expect(updateBody.item.otlp_exporter).to.eql(newExporter);
      });

      it('converts an ES output to OTLP and clears beats-specific fields', async () => {
        const { body: createBody } = await supertest
          .post('/api/fleet/outputs')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `es-to-otlp-${uuidv4()}`,
            type: 'elasticsearch',
            hosts: ['https://es.example.com:9200'],
          })
          .expect(200);

        const { id } = createBody.item;

        const { body: updateBody } = await supertest
          .put(`/api/fleet/outputs/${id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            type: 'otlp',
            otlp_exporter: { endpoint: 'https://otlp.example.com:4317', protocol: 'grpc' },
          })
          .expect(200);

        expect(updateBody.item.type).to.be('otlp');
        expect(updateBody.item.otlp_exporter).to.eql({
          endpoint: 'https://otlp.example.com:4317',
          protocol: 'grpc',
        });
        expect(updateBody.item.hosts).to.be(null);
      });

      it('converts an OTLP output to ES and clears otlp_exporter', async () => {
        const { body: createBody } = await supertest
          .post('/api/fleet/outputs')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `otlp-to-es-${uuidv4()}`,
            type: 'otlp',
            otlp_exporter: { endpoint: 'https://otlp.example.com:4317', protocol: 'grpc' },
          })
          .expect(200);

        const { id } = createBody.item;

        const { body: updateBody } = await supertest
          .put(`/api/fleet/outputs/${id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            type: 'elasticsearch',
            hosts: ['https://es.example.com:9200'],
          })
          .expect(200);

        expect(updateBody.item.type).to.be('elasticsearch');
        expect(updateBody.item.otlp_exporter).to.be(null);
        expect(updateBody.item.hosts).to.eql(['https://es.example.com:9200']);
      });
    });

    describe('DELETE /api/fleet/outputs/{id}', () => {
      it('removes all associated ESO secrets when an OTLP output is deleted', async () => {
        const { body: createBody } = await supertest
          .post('/api/fleet/outputs')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `otlp-delete-secrets-${uuidv4()}`,
            type: 'otlp',
            otlp_exporter: { endpoint: 'https://otlp.example.com:4317', protocol: 'grpc' },
            secrets: {
              otlp_exporter: {
                tls: {
                  key_pem: 'to-be-deleted-key',
                  tpm: { owner_auth: 'to-be-deleted-owner-auth', auth: 'to-be-deleted-auth' },
                },
              },
            },
          })
          .expect(200);

        const { id } = createBody.item;
        const keyPemSecretId: string = createBody.item.secrets?.otlp_exporter?.tls?.key_pem?.id;
        const ownerAuthSecretId: string =
          createBody.item.secrets?.otlp_exporter?.tls?.tpm?.owner_auth?.id;
        const authSecretId: string = createBody.item.secrets?.otlp_exporter?.tls?.tpm?.auth?.id;
        expect(keyPemSecretId).to.be.a('string');
        expect(ownerAuthSecretId).to.be.a('string');
        expect(authSecretId).to.be.a('string');

        // All secrets exist before delete
        await getSecretById(keyPemSecretId);
        await getSecretById(ownerAuthSecretId);
        await getSecretById(authSecretId);

        await supertest.delete(`/api/fleet/outputs/${id}`).set('kbn-xsrf', 'xxxx').expect(200);

        // All secrets must be cleaned up
        for (const secretId of [keyPemSecretId, ownerAuthSecretId, authSecretId]) {
          try {
            await getSecretById(secretId);
            throw new Error(`Expected ESO secret ${secretId} to be deleted alongside the output`);
          } catch (err) {
            expect(err.meta?.statusCode).to.be(404);
          }
        }
      });
    });

    describe('policy gating', () => {
      beforeEach(async () => {
        // The outer beforeEach already ran cleanStandardList + fleet/setup; re-install
        // the OTel test package whose SO was wiped by the clean.
        await supertest
          .post(`/api/fleet/epm/packages/${DYNAMIC_PKG}/${DYNAMIC_PKG_VERSION}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });

      it('allows assigning the OTLP output to a pure-OTel agent policy', async () => {
        const { body: outputBody } = await supertest
          .post('/api/fleet/outputs')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `otlp-gating-allowed-${uuidv4()}`,
            type: 'otlp',
            otlp_exporter: { endpoint: 'https://otlp.example.com:4317', protocol: 'grpc' },
          })
          .expect(200);
        const otlpOutputId: string = outputBody.item.id;

        const policyName = `otel-only-${uuidv4()}`;
        const { body: policyBody } = await supertest
          .post('/api/fleet/agent_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({ name: policyName, namespace: 'default' })
          .expect(200);
        const policyId: string = policyBody.item.id;

        await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `otel-pkg-${uuidv4()}`,
            namespace: 'default',
            policy_id: policyId,
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

        // Assigning OTLP output to a pure-OTel policy must succeed
        await supertest
          .put(`/api/fleet/agent_policies/${policyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ name: policyName, namespace: 'default', data_output_id: otlpOutputId })
          .expect(200);
      });

      it('rejects assigning the OTLP output to a mixed OTel+beats agent policy', async () => {
        const { body: outputBody } = await supertest
          .post('/api/fleet/outputs')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `otlp-gating-rejected-${uuidv4()}`,
            type: 'otlp',
            otlp_exporter: { endpoint: 'https://otlp.example.com:4317', protocol: 'grpc' },
          })
          .expect(200);
        const otlpOutputId: string = outputBody.item.id;

        const policyName = `mixed-${uuidv4()}`;
        const { body: policyBody } = await supertest
          .post('/api/fleet/agent_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({ name: policyName, namespace: 'default' })
          .expect(200);
        const policyId: string = policyBody.item.id;

        await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `otel-pkg-${uuidv4()}`,
            namespace: 'default',
            policy_id: policyId,
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

        // Also add a non-OTel (beats) package policy to make the policy mixed
        await supertest
          .post('/api/fleet/package_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `filetest-pkg-${uuidv4()}`,
            namespace: 'default',
            policy_id: policyId,
            package: { name: 'filetest', title: 'For File Tests', version: '0.1.0' },
            inputs: [],
          })
          .expect(200);

        // Assigning OTLP output to a mixed policy must be rejected
        await supertest
          .put(`/api/fleet/agent_policies/${policyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ name: policyName, namespace: 'default', data_output_id: otlpOutputId })
          .expect(400);
      });
    });
  });
}
