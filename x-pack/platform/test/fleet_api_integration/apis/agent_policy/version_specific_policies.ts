/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semver from 'semver';
import expect from '@kbn/expect';
import { INGEST_SAVED_OBJECT_INDEX } from '@kbn/fleet-plugin/server/constants';
import { skipIfNoDockerRegistry } from '../../helpers';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');
  const retry = getService('retry');
  let currentMinor: string;
  let previousMinor: string;

  async function verifyReassignAction(
    agentPolicyId: string,
    agentId: string,
    versionSuffix: string
  ) {
    const actionSearchResponse = await es.search({
      index: '.fleet-actions',
      q: `agents:${agentId}`,
    });
    expect(actionSearchResponse.hits.hits.length).to.eql(1);
    const actionDoc = actionSearchResponse.hits.hits[0]._source as any;
    expect(actionDoc.data.policy_id).to.eql(`${agentPolicyId}#${versionSuffix}`);
    expect(actionDoc.type).to.eql('POLICY_REASSIGN');
  }

  describe('fleet_version_specific_policies', () => {
    skipIfNoDockerRegistry(providerContext);
    let kibanaVersion: string;
    let previousMinorVersion: string;

    before(async () => {
      kibanaVersion = await kibanaServer.version.get();
      const coercedKibanaVersion = semver.coerce(kibanaVersion);
      currentMinor = `${coercedKibanaVersion?.major}.${coercedKibanaVersion?.minor}`;
      previousMinor = `${coercedKibanaVersion?.major}.${(coercedKibanaVersion?.minor ?? 1) - 1}`;
      previousMinorVersion = `${previousMinor}.0`;
    });

    describe('package level agent version condition', () => {
      let agentPolicyWithPPId: string;
      let packagePolicyId: string;
      const agentId = `agent-package-${Date.now()}`;
      const upgradedAgentId = `upgraded-package-${Date.now()}`;

      async function createAgentPolicyWithPackagePolicy() {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy 1',
            namespace: 'default',
            force: true,
          })
          .expect(200);
        agentPolicyWithPPId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'abnormal_security-1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyWithPPId,
            enabled: true,
            inputs: [
              {
                policy_template: 'abnormal_security',
                type: 'cel',
                enabled: true,
                streams: [],
              },
            ],
            package: {
              name: 'abnormal_security',
              version: '1.12.0',
            },
          });
        packagePolicyId = packagePolicyResponse.item.id;
      }

      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();
        await createAgentPolicyWithPackagePolicy();
        await fleetAndAgents.generateAgent(
          'online',
          agentId,
          agentPolicyWithPPId,
          previousMinorVersion,
          undefined,
          undefined,
          true
        );
        await fleetAndAgents.generateAgent(
          'online',
          upgradedAgentId,
          `${agentPolicyWithPPId}#${previousMinor}`,
          kibanaVersion,
          undefined,
          new Date().toISOString(),
          true
        );
      });
      after(async () => {
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId: agentPolicyWithPPId })
          .expect(200);
      });
      it('should create version specific policies with common agent versions and package level agent version condition', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyWithPPId}`)
          .expect(200);
        expect(body.item.has_agent_version_conditions).to.eql(true);

        const policies = await es.search({
          index: '.fleet-policies',
          _source: ['data.inputs', 'policy_id'],
        });
        const versionedPolicies = policies.hits.hits.filter(
          (hit) =>
            (hit._source as any).policy_id.includes('#') &&
            (hit._source as any).policy_id.startsWith(agentPolicyWithPPId)
        );
        expect(versionedPolicies.length).to.eql(3);

        versionedPolicies.forEach((policy) => {
          const source = policy._source as any;
          if (source.policy_id.split('#')[1] >= '9.3') {
            expect(source.data.inputs[0].name).to.eql('abnormal_security-1');
          } else {
            expect(source.data.inputs.length).to.eql(0);
          }
        });

        await retry.tryForTime(20000, async () => {
          // verify agent with parent policy is reassigned
          await verifyReassignAction(agentPolicyWithPPId, agentId, previousMinor);

          // verify upgraded agent with version specific policy is reassigned
          await verifyReassignAction(agentPolicyWithPPId, upgradedAgentId, currentMinor);
        });
      });

      it('should set has_agent_version_conditions to false when package policy is deleted', async () => {
        await supertest
          .delete(`/api/fleet/package_policies/${packagePolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyWithPPId}`)
          .expect(200);
        expect(body.item.has_agent_version_conditions).to.eql(false);
      });
    });

    describe('template level agent version condition', () => {
      let agentPolicyWithPPId: string;
      let packagePolicyId: string;
      const agentId = `agent-template-${Date.now()}`;
      const upgradedAgentId = `upgraded-template-${Date.now()}`;

      async function createAgentPolicyWithPackagePolicy() {
        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy 2',
            namespace: 'default',
            force: true,
          })
          .expect(200);
        agentPolicyWithPPId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'auth0-1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyWithPPId,
            enabled: true,
            inputs: [
              {
                policy_template: 'auth0_events',
                type: 'cel',
                enabled: true,
                streams: [
                  {
                    enabled: true,
                    data_stream: {
                      type: 'logs',
                      dataset: 'auth0.logs',
                    },
                    vars: {
                      url: {
                        value: 'https://tenant.us.auth0.com',
                        type: 'text',
                      },
                      client_id: {
                        type: 'text',
                        value: 'id',
                      },
                      client_secret: {
                        type: 'password',
                        value: 'secret',
                      },
                      initial_interval: {
                        value: '24h',
                        type: 'text',
                      },
                      interval: {
                        value: '5m',
                        type: 'text',
                      },
                      batch_size: {
                        value: 100,
                        type: 'integer',
                      },
                      http_client_timeout: {
                        value: '30s',
                        type: 'text',
                      },
                      tags: {
                        value: ['forwarded', 'auth0-logstream'],
                        type: 'text',
                      },
                      preserve_original_event: {
                        value: false,
                        type: 'bool',
                      },
                    },
                  },
                ],
              },
            ],
            package: {
              name: 'auth0',
              version: '1.26.0',
            },
          });
        packagePolicyId = packagePolicyResponse.item.id;
      }

      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();
        await createAgentPolicyWithPackagePolicy();
        await fleetAndAgents.generateAgent(
          'online',
          agentId,
          agentPolicyWithPPId,
          previousMinorVersion,
          undefined,
          undefined,
          true
        );
        await fleetAndAgents.generateAgent(
          'online',
          upgradedAgentId,
          `${agentPolicyWithPPId}#${previousMinor}`,
          kibanaVersion,
          undefined,
          new Date().toISOString(),
          true
        );
      });
      after(async () => {
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId: agentPolicyWithPPId })
          .expect(200);
      });
      it('should create version specific policies with common agent versions and template level agent version condition', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyWithPPId}`)
          .expect(200);
        expect(body.item.has_agent_version_conditions).to.eql(true);

        // check inputs for versions saved in package policy SO
        const res: any = await es.transport.request({
          method: 'GET',
          path: `/${INGEST_SAVED_OBJECT_INDEX}/_doc/fleet-package-policies:${packagePolicyId}`,
        });
        const inputsForVersions = res._source?.['fleet-package-policies']?.inputs_for_versions;
        expect(Object.keys(inputsForVersions).length).to.eql(3);
        for (const ver of Object.keys(inputsForVersions)) {
          if (ver >= '9.3') {
            expect(inputsForVersions[ver][0].streams[0].compiled_stream.program).to.not.be(
              undefined
            );
          } else {
            expect(inputsForVersions[ver][0].streams[0].compiled_stream.program).to.be(undefined);
          }
        }

        // check version specific policies created
        const policies = await es.search({
          index: '.fleet-policies',
          _source: ['data.inputs', 'policy_id'],
        });
        const versionedPolicies = policies.hits.hits.filter(
          (hit) =>
            (hit._source as any).policy_id.includes('#') &&
            (hit._source as any).policy_id.startsWith(agentPolicyWithPPId)
        );
        expect(versionedPolicies.length).to.eql(3);

        versionedPolicies.forEach((policy) => {
          const source = policy._source as any;
          if (source.policy_id.split('#')[1] >= '9.3') {
            expect(source.data.inputs[0].name).to.eql('auth0-1');
            expect(source.data.inputs[0].streams[0].id).to.contain('cel-auth0.logs-');
            expect(source.data.inputs[0].streams[0].program).not.to.be(undefined);
          } else {
            expect(source.data.inputs[0].name).to.eql('auth0-1');
            expect(source.data.inputs[0].streams[0].id).to.contain('cel-auth0.logs-');
            expect(source.data.inputs[0].streams[0].program).to.be(undefined);
          }
        });

        await retry.tryForTime(20000, async () => {
          // verify agent with parent policy is reassigned
          await verifyReassignAction(agentPolicyWithPPId, agentId, previousMinor);

          // verify upgraded agent with version specific policy is reassigned
          await verifyReassignAction(agentPolicyWithPPId, upgradedAgentId, currentMinor);
        });
      });

      it('should set has_agent_version_conditions to false when package policy is deleted', async () => {
        await supertest
          .delete(`/api/fleet/package_policies/${packagePolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyWithPPId}`)
          .expect(200);
        expect(body.item.has_agent_version_conditions).to.eql(false);
      });
    });
  });
}
