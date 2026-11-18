/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semver from 'semver';
import expect from '@kbn/expect';
import { hasSentinelVersionSuffix } from '@kbn/fleet-plugin/common/services';
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
        // Agents get reassigned to version-specific policy variants during the tests, so their
        // policy_id no longer exactly matches agentPolicyWithPPId — delete them explicitly first
        // (deleting the policy directly would otherwise correctly fail while agents remain assigned).
        await supertest.delete(`/api/fleet/agents/${agentId}`).set('kbn-xsrf', 'xxxx').expect(200);
        await supertest
          .delete(`/api/fleet/agents/${upgradedAgentId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        // Retry to tolerate the unenroll updates above not being immediately visible to the
        // policy delete guard's search.
        await retry.tryForTime(20000, async () => {
          await supertest
            .post(`/api/fleet/agent_policies/delete`)
            .set('kbn-xsrf', 'xxxx')
            .send({ agentPolicyId: agentPolicyWithPPId })
            .expect(200);
        });
      });
      it('should include agents on version-specific policies in agent count when getting policy', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyWithPPId}`)
          .expect(200);
        // One agent on parent policy (agentId), one on version-specific (upgradedAgentId); both counted under parent
        expect(body.item.agents).to.eql(2);
      });

      it('should include agents on version-specific policies in agent count when listing with withAgentCount', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies?withAgentCount=true&perPage=100`)
          .expect(200);
        const policy = body.items.find((p: { id: string }) => p.id === agentPolicyWithPPId);
        expect(policy).to.be.ok();
        expect(policy.agents).to.eql(2);
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
        // `#sentinel` docs are written while the policy has no version conditions yet, before the package policy is added
        const versionedPolicies = policies.hits.hits.filter(
          (hit) =>
            (hit._source as any).policy_id.includes('#') &&
            !hasSentinelVersionSuffix((hit._source as any).policy_id) &&
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
        // Agents get reassigned to version-specific policy variants during the tests, so their
        // policy_id no longer exactly matches agentPolicyWithPPId — delete them explicitly first
        // (deleting the policy directly would otherwise correctly fail while agents remain assigned).
        await supertest.delete(`/api/fleet/agents/${agentId}`).set('kbn-xsrf', 'xxxx').expect(200);
        await supertest
          .delete(`/api/fleet/agents/${upgradedAgentId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        // Retry to tolerate the unenroll updates above not being immediately visible to the
        // policy delete guard's search.
        await retry.tryForTime(20000, async () => {
          await supertest
            .post(`/api/fleet/agent_policies/delete`)
            .set('kbn-xsrf', 'xxxx')
            .send({ agentPolicyId: agentPolicyWithPPId })
            .expect(200);
        });
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
        // `#sentinel` docs are written while the policy has no version conditions yet, before the package policy is added
        const versionedPolicies = policies.hits.hits.filter(
          (hit) =>
            (hit._source as any).policy_id.includes('#') &&
            !hasSentinelVersionSuffix((hit._source as any).policy_id) &&
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

    describe('package upgrade that drops the agent version condition', () => {
      let agentPolicyId: string;
      let packagePolicyId: string;
      const agentId = `agent-upgrade-${Date.now()}`;

      async function getInputsForVersions() {
        const res: any = await es.transport.request({
          method: 'GET',
          path: `/${INGEST_SAVED_OBJECT_INDEX}/_doc/fleet-package-policies:${packagePolicyId}`,
        });
        return res._source?.['fleet-package-policies']?.inputs_for_versions ?? {};
      }

      async function getAgentPolicyId() {
        const { body } = await supertest.get(`/api/fleet/agents/${agentId}`).expect(200);
        return body.item.policy_id;
      }

      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();

        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({ name: 'VSP upgrade policy', namespace: 'default', force: true })
          .expect(200);
        agentPolicyId = agentPolicyResponse.item.id;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'abnormal_security-upgrade',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            inputs: [
              {
                policy_template: 'abnormal_security',
                type: 'cel',
                enabled: true,
                vars: {
                  url: { value: 'https://api.abnormalplatform.com', type: 'url' },
                  access_token: { value: 'token', type: 'password' },
                },
                streams: [
                  {
                    enabled: true,
                    data_stream: { type: 'logs', dataset: 'abnormal_security.audit' },
                    vars: {
                      initial_interval: { value: '24h', type: 'text' },
                      interval: { value: '5m', type: 'text' },
                      page_size: { value: '100', type: 'text' },
                      http_client_timeout: { value: '30s', type: 'text' },
                      tags: { value: ['forwarded', 'abnormal_security-audit'], type: 'text' },
                    },
                  },
                ],
              },
            ],
            package: { name: 'abnormal_security', version: '1.12.0' },
          })
          .expect(200);
        packagePolicyId = packagePolicyResponse.item.id;

        // The package policy is upgraded to the latest installed version, so install it first.
        await supertest
          .post(`/api/fleet/epm/packages/abnormal_security/1.12.1`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);

        await fleetAndAgents.generateAgent(
          'online',
          agentId,
          agentPolicyId,
          previousMinorVersion,
          undefined,
          undefined,
          true
        );
      });

      after(async () => {
        await supertest.delete(`/api/fleet/agents/${agentId}`).set('kbn-xsrf', 'xxxx').expect(200);
        await retry.tryForTime(20000, async () => {
          await supertest
            .post(`/api/fleet/agent_policies/delete`)
            .set('kbn-xsrf', 'xxxx')
            .send({ agentPolicyId })
            .expect(200);
        });
      });

      it('should clear inputs_for_versions and has_agent_version_conditions after upgrading to a package without the condition', async () => {
        const { body: before } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyId}`)
          .expect(200);
        expect(before.item.has_agent_version_conditions).to.eql(true);
        expect(Object.keys(await getInputsForVersions()).length).to.be.greaterThan(0);

        const { body: upgradeResponse } = await supertest
          .post(`/api/fleet/package_policies/upgrade`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicyId] })
          .expect(200);
        // The route returns 200 with a per item result.
        expect(upgradeResponse[0].success).to.eql(true);

        const { body: upgraded } = await supertest
          .get(`/api/fleet/package_policies/${packagePolicyId}`)
          .expect(200);
        expect(upgraded.item.package.version).to.eql('1.12.1');

        expect(Object.keys(await getInputsForVersions()).length).to.eql(0);

        const { body: after } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyId}`)
          .expect(200);
        expect(after.item.has_agent_version_conditions).to.eql(false);
      });

      it('should serve later edits to agents on the base policy', async () => {
        await retry.tryForTime(20000, async () => {
          expect(await getAgentPolicyId()).to.eql(agentPolicyId);
        });

        const { body: current } = await supertest
          .get(`/api/fleet/package_policies/${packagePolicyId}`)
          .expect(200);
        const { id, revision, updated_at, updated_by, created_at, created_by, ...updatable } =
          current.item;
        updatable.inputs[0].streams[0].vars.interval.value = '10m';
        await supertest
          .put(`/api/fleet/package_policies/${packagePolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updatable)
          .expect(200);

        await retry.tryForTime(20000, async () => {
          const { body } = await supertest
            .get(`/api/fleet/agent_policies/${agentPolicyId}/full`)
            .expect(200);
          const input = body.item.inputs.find(
            (i: { meta?: { package?: { name?: string } } }) =>
              i.meta?.package?.name === 'abnormal_security'
          );
          expect(input.streams[0].interval).to.eql('10m');
        });

        expect(Object.keys(await getInputsForVersions()).length).to.eql(0);
        expect(await getAgentPolicyId()).to.eql(agentPolicyId);
      });
    });

    describe('version specific policies telemetry', () => {
      let policyWithPackageConditionsId: string;
      let policyWithTemplateConditionsId: string;

      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();

        // Agent policy with package-level version conditions (abnormal_security has package-level condition)
        const { body: policy1Response } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({ name: 'VSP telemetry policy 1', namespace: 'default', force: true })
          .expect(200);
        policyWithPackageConditionsId = policy1Response.item.id;

        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'abnormal_security-telemetry',
            namespace: 'default',
            policy_id: policyWithPackageConditionsId,
            enabled: true,
            inputs: [
              {
                policy_template: 'abnormal_security',
                type: 'cel',
                enabled: true,
                streams: [],
              },
            ],
            package: { name: 'abnormal_security', version: '1.12.0' },
          })
          .expect(200);

        // Agent policy with template-level version conditions (auth0 has _meta.agent.version in .hbs)
        const { body: policy2Response } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({ name: 'VSP telemetry policy 2', namespace: 'default', force: true })
          .expect(200);
        policyWithTemplateConditionsId = policy2Response.item.id;

        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'auth0-telemetry',
            namespace: 'default',
            policy_id: policyWithTemplateConditionsId,
            enabled: true,
            inputs: [
              {
                policy_template: 'auth0_events',
                type: 'cel',
                enabled: true,
                streams: [
                  {
                    enabled: true,
                    data_stream: { type: 'logs', dataset: 'auth0.logs' },
                    vars: {
                      url: { value: 'https://tenant.us.auth0.com', type: 'text' },
                      client_id: { value: 'id', type: 'text' },
                      client_secret: { value: 'secret', type: 'password' },
                      initial_interval: { value: '24h', type: 'text' },
                      interval: { value: '5m', type: 'text' },
                      batch_size: { value: 100, type: 'integer' },
                      http_client_timeout: { value: '30s', type: 'text' },
                      tags: { value: ['forwarded', 'auth0-logstream'], type: 'text' },
                      preserve_original_event: { value: false, type: 'bool' },
                    },
                  },
                ],
              },
            ],
            package: { name: 'auth0', version: '1.26.0' },
          })
          .expect(200);

        // Enroll agents with versioned policy IDs (policy_id contains '#')
        await es.bulk({
          index: '.fleet-agents',
          body: [
            { create: { _id: 'agent-vspc-telemetry-1' } },
            {
              agent: { version: '8.15.0' },
              active: true,
              policy_id: `${policyWithPackageConditionsId}#8.15`,
              last_checkin: new Date().toISOString(),
              last_checkin_status: 'online',
            },
            { create: { _id: 'agent-vspc-telemetry-2' } },
            {
              agent: { version: '8.15.0' },
              active: true,
              policy_id: `${policyWithPackageConditionsId}#8.15`,
              last_checkin: new Date().toISOString(),
              last_checkin_status: 'online',
            },
            { create: { _id: 'agent-vspc-telemetry-3' } },
            {
              agent: { version: '8.14.0' },
              active: true,
              policy_id: `${policyWithTemplateConditionsId}#8.14`,
              last_checkin: new Date().toISOString(),
              last_checkin_status: 'online',
            },
          ],
          refresh: 'wait_for',
        });
      });

      after(async () => {
        // refresh: true ensures these deletes are visible to the agent policy delete guard's
        // search below — otherwise it can still see these agents (assigned via their versioned
        // policy_id) and correctly refuse to delete the policy while they appear assigned.
        await es
          .delete({ index: '.fleet-agents', id: 'agent-vspc-telemetry-1', refresh: true })
          .catch(() => {});
        await es
          .delete({ index: '.fleet-agents', id: 'agent-vspc-telemetry-2', refresh: true })
          .catch(() => {});
        await es
          .delete({ index: '.fleet-agents', id: 'agent-vspc-telemetry-3', refresh: true })
          .catch(() => {});
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId: policyWithPackageConditionsId })
          .expect(200);
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId: policyWithTemplateConditionsId })
          .expect(200);
      });

      it('should report packages with agent version conditions and agents on versioned policies', async () => {
        const { body } = await supertest
          .get('/internal/fleet/telemetry/usage')
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .expect(200);

        const usage = body.usage;

        expect(usage.packages_with_agent_version_conditions).to.contain('abnormal_security');
        expect(usage.packages_with_agent_version_conditions).to.contain('auth0');

        const versionsWithAgents = usage.agents_on_version_specific_policies_per_version;
        const agents815 = versionsWithAgents.find(
          (v: { agent_version: string }) => v.agent_version === '8.15.0'
        );
        const agents814 = versionsWithAgents.find(
          (v: { agent_version: string }) => v.agent_version === '8.14.0'
        );
        expect(agents815).to.be.ok();
        expect(agents815.count).to.eql(2);
        expect(agents814).to.be.ok();
        expect(agents814.count).to.eql(1);

        expect(usage.agent_policies.count_with_agent_version_conditions).to.eql(2);
      });
    });
  });
}
