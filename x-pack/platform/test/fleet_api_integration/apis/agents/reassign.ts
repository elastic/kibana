/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const fleetAndAgents = getService('fleetAndAgents');

  const epmInstall = async (pkgName: string, pkgVersion: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };

  describe('fleet_reassign_agent', () => {
    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await fleetAndAgents.setup();
    });
    beforeEach(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/agents');
      await getService('supertest').post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').send();
    });
    afterEach(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/agents');
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });
    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    describe('reassign single agent', () => {
      it('should allow to reassign single agent', async () => {
        await supertest
          .post(`/api/fleet/agents/agent1/reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy2',
          })
          .expect(200);
        const { body } = await supertest.get(`/api/fleet/agents/agent1`);
        expect(body.item.policy_id).to.eql('policy2');
      });

      it('should throw an error for invalid policy id for single reassign', async () => {
        await supertest
          .post(`/api/fleet/agents/agent1/reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'INVALID_ID',
          })
          .expect(404);
      });

      it('can reassign from regular agent policy to regular', async () => {
        // policy2 is not hosted
        // reassign succeeds
        await supertest
          .post(`/api/fleet/agents/agent1/reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy2',
          })
          .expect(200);
      });

      it('cannot reassign from regular agent policy to hosted', async () => {
        // agent1 is enrolled in policy1. set policy1 to hosted
        await supertest
          .put(`/api/fleet/agent_policies/policy1`)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'Test policy', namespace: 'default', is_managed: true })
          .expect(200);

        // reassign fails
        await supertest
          .post(`/api/fleet/agents/agent1/reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy2',
          })
          .expect(400);
      });

      describe('version compatibility', () => {
        skipIfNoDockerRegistry(providerContext);

        // Use existing policy1 from esArchiver fixture instead of creating a new one
        const sourcePolicyId = 'policy1';
        let targetPolicyWithVersionId: string;

        beforeEach(async () => {
          await epmInstall('agent_version_test', '1.0.0');

          const { body: targetPolicyWithVersion } = await supertest
            .post(`/api/fleet/agent_policies`)
            .set('kbn-xsrf', 'xxx')
            .send({
              name: 'Target policy with version requirement',
              namespace: 'default',
            })
            .expect(200);
          targetPolicyWithVersionId = targetPolicyWithVersion.item.id;

          await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxx')
            .send({
              name: 'agent-version-test-reassign',
              description: '',
              namespace: 'default',
              policy_id: targetPolicyWithVersionId,
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
        });

        it('should allow reassigning when agent version is compatible', async () => {
          // Create agent with compatible version
          await fleetAndAgents.generateAgent('online', 'agent-compat-1', sourcePolicyId, '8.12.0');

          await supertest
            .post(`/api/fleet/agents/agent-compat-1/reassign`)
            .set('kbn-xsrf', 'xxx')
            .send({
              policy_id: targetPolicyWithVersionId,
            })
            .expect(200);

          const { body } = await supertest.get(`/api/fleet/agents/agent-compat-1`).expect(200);
          expect(body.item.policy_id).to.eql(targetPolicyWithVersionId);
        });

        it('should throw an error when agent version is incompatible', async () => {
          // Create agent with incompatible version
          await fleetAndAgents.generateAgent(
            'online',
            'agent-incompat-1',
            sourcePolicyId,
            '8.11.0'
          );

          const { body } = await supertest
            .post(`/api/fleet/agents/agent-incompat-1/reassign`)
            .set('kbn-xsrf', 'xxx')
            .send({
              policy_id: targetPolicyWithVersionId,
            })
            .expect(400);

          expect(body.message).to.contain('does not satisfy required version range');
          expect(body.message).to.contain('Use force:true to override');
        });

        it('should allow reassigning with force=true when agent version is incompatible', async () => {
          // Create agent with incompatible version
          await fleetAndAgents.generateAgent('online', 'agent-force-1', sourcePolicyId, '8.11.0');

          await supertest
            .post(`/api/fleet/agents/agent-force-1/reassign`)
            .set('kbn-xsrf', 'xxx')
            .send({
              policy_id: targetPolicyWithVersionId,
              force: true,
            })
            .expect(200);

          const { body } = await supertest.get(`/api/fleet/agents/agent-force-1`).expect(200);
          expect(body.item.policy_id).to.eql(targetPolicyWithVersionId);
        });
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/162545
    describe.skip('bulk reassign agents', () => {
      it('should allow to reassign multiple agents by id', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'agent3'],
            policy_id: 'policy2',
          })
          .expect(200);
        const [agent2data, agent3data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent3`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(agent2data.body.item.policy_id).to.eql('policy2');
        expect(agent3data.body.item.policy_id).to.eql('policy2');
      });

      it('should allow to reassign multiple agents by id -- mix valid & invalid', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'INVALID_ID', 'agent3', 'MISSING_ID', 'etc'],
            policy_id: 'policy2',
          });

        const [agent2data, agent3data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent2`),
          supertest.get(`/api/fleet/agents/agent3`),
        ]);
        expect(agent2data.body.item.policy_id).to.eql('policy2');
        expect(agent3data.body.item.policy_id).to.eql('policy2');

        const { body } = await supertest
          .get(`/api/fleet/agents/action_status`)
          .set('kbn-xsrf', 'xxx');
        const actionStatus = body.items[0];

        expect(actionStatus.status).to.eql('FAILED');
        expect(actionStatus.nbAgentsActionCreated).to.eql(2);
        expect(actionStatus.nbAgentsFailed).to.eql(3);
      });

      it('should return error when none of the agents can be reassigned -- mixed invalid, hosted, etc', async () => {
        // agent1 is enrolled in policy1. set policy1 to hosted
        await supertest
          .put(`/api/fleet/agent_policies/policy1`)
          .set('kbn-xsrf', 'xxx')
          .send({ name: 'Test policy', namespace: 'default', is_managed: true })
          .expect(200);

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'INVALID_ID', 'agent3'],
            policy_id: 'policy2',
          })
          .expect(400);
        expect(body.message).to.eql('No agents to reassign, already assigned or hosted agents');

        const [agent2data, agent3data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent2`),
          supertest.get(`/api/fleet/agents/agent3`),
        ]);
        expect(agent2data.body.item.policy_id).to.eql('policy1');
        expect(agent3data.body.item.policy_id).to.eql('policy1');
      });

      it('should allow to reassign multiple agents by kuery', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active: true',
            policy_id: 'policy2',
          })
          .expect(200);

        const { body } = await supertest.get(`/api/fleet/agents`).set('kbn-xsrf', 'xxx');
        expect(body.total).to.eql(4);
        body.items.forEach((agent: any) => {
          expect(agent.policy_id).to.eql('policy2');
        });
      });

      it('should bulk reassign multiple agents by kuery in batches', async () => {
        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active: true',
            policy_id: 'policy2',
            batchSize: 2,
          })
          .expect(200);

        const actionId = body.actionId;

        const verifyActionResult = async () => {
          const { body: result } = await supertest.get(`/api/fleet/agents`).set('kbn-xsrf', 'xxx');
          expect(result.total).to.eql(4);
          result.items.forEach((agent: any) => {
            expect(agent.policy_id).to.eql('policy2');
          });
        };
        // TODO: use helper function `checkBulkAgentAction`
        await new Promise((resolve, reject) => {
          let attempts = 0;
          const intervalId = setInterval(async () => {
            if (attempts > 5) {
              clearInterval(intervalId);
              reject(new Error('action timed out'));
            }
            ++attempts;
            const {
              body: { items: actionStatuses },
            } = await supertest.get(`/api/fleet/agents/action_status`).set('kbn-xsrf', 'xxx');

            const action = actionStatuses.find((a: any) => a.actionId === actionId);
            if (action && action.nbAgentsActioned === action.nbAgentsActionCreated) {
              clearInterval(intervalId);
              await verifyActionResult();
              resolve({});
            }
          }, 1000);
        }).catch((e) => {
          throw e;
        });
      });

      it('should throw an error for invalid policy id for bulk reassign', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_reassign`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'agent3'],
            policy_id: 'INVALID_ID',
          })
          .expect(404);
      });

      it('should return a 403 if user lacks fleet all permissions', async () => {
        await supertestWithoutAuth
          .post(`/api/fleet/agents/bulk_reassign`)
          .auth(testUsers.fleet_no_access.username, testUsers.fleet_no_access.password)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent2', 'agent3'],
            policy_id: 'policy2',
          })
          .expect(403);
      });

      describe('version compatibility', () => {
        skipIfNoDockerRegistry(providerContext);

        // Use existing policy1 from esArchiver fixture instead of creating a new one
        const bulkSourcePolicyId = 'policy1';
        let bulkTargetPolicyWithVersionId: string;

        beforeEach(async () => {
          await epmInstall('agent_version_test', '1.0.0');

          const { body: bulkTargetPolicyWithVersion } = await supertest
            .post(`/api/fleet/agent_policies`)
            .set('kbn-xsrf', 'xxx')
            .send({
              name: 'Bulk target policy with version requirement',
              namespace: 'default',
            })
            .expect(200);
          bulkTargetPolicyWithVersionId = bulkTargetPolicyWithVersion.item.id;

          await supertest
            .post(`/api/fleet/package_policies`)
            .set('kbn-xsrf', 'xxx')
            .send({
              name: 'agent-version-test-bulk-reassign',
              description: '',
              namespace: 'default',
              policy_id: bulkTargetPolicyWithVersionId,
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
        });

        it('should allow bulk reassigning when all agent versions are compatible', async () => {
          // Create multiple agents with compatible versions
          await fleetAndAgents.generateAgent(
            'online',
            'bulk-compat-1',
            bulkSourcePolicyId,
            '8.12.0'
          );
          await fleetAndAgents.generateAgent(
            'online',
            'bulk-compat-2',
            bulkSourcePolicyId,
            '8.13.0'
          );
          await fleetAndAgents.generateAgent(
            'online',
            'bulk-compat-3',
            bulkSourcePolicyId,
            '8.13.0'
          );

          const { body } = await supertest
            .post(`/api/fleet/agents/bulk_reassign`)
            .set('kbn-xsrf', 'xxx')
            .send({
              agents: ['bulk-compat-1', 'bulk-compat-2', 'bulk-compat-3'],
              policy_id: bulkTargetPolicyWithVersionId,
            })
            .expect(200);

          const actionId = body.actionId;

          // Wait for action to complete
          await new Promise((resolve, reject) => {
            let attempts = 0;
            const intervalId = setInterval(async () => {
              if (attempts > 10) {
                clearInterval(intervalId);
                reject(new Error('action timed out'));
                return;
              }
              ++attempts;
              const {
                body: { items: actionStatuses },
              } = await supertest.get(`/api/fleet/agents/action_status`).set('kbn-xsrf', 'xxx');

              const action = actionStatuses.find((a: any) => a.actionId === actionId);
              if (action && action.nbAgentsActioned === action.nbAgentsActionCreated) {
                clearInterval(intervalId);
                resolve({});
              }
            }, 1000);
          });

          // Verify all agents were reassigned
          const [agent1data, agent2data, agent3data] = await Promise.all([
            supertest.get(`/api/fleet/agents/bulk-compat-1`).set('kbn-xsrf', 'xxx'),
            supertest.get(`/api/fleet/agents/bulk-compat-2`).set('kbn-xsrf', 'xxx'),
            supertest.get(`/api/fleet/agents/bulk-compat-3`).set('kbn-xsrf', 'xxx'),
          ]);
          expect(agent1data.body.item.policy_id).to.eql(bulkTargetPolicyWithVersionId);
          expect(agent2data.body.item.policy_id).to.eql(bulkTargetPolicyWithVersionId);
          expect(agent3data.body.item.policy_id).to.eql(bulkTargetPolicyWithVersionId);
        });

        it('should partially succeed when some agent versions are incompatible', async () => {
          // Create mix of compatible and incompatible agents
          await fleetAndAgents.generateAgent(
            'online',
            'bulk-mixed-1',
            bulkSourcePolicyId,
            '8.12.0'
          );
          await fleetAndAgents.generateAgent(
            'online',
            'bulk-mixed-2',
            bulkSourcePolicyId,
            '8.11.0'
          );
          await fleetAndAgents.generateAgent(
            'online',
            'bulk-mixed-3',
            bulkSourcePolicyId,
            '8.12.0'
          );
          await fleetAndAgents.generateAgent(
            'online',
            'bulk-mixed-4',
            bulkSourcePolicyId,
            '8.11.0'
          );

          const { body } = await supertest
            .post(`/api/fleet/agents/bulk_reassign`)
            .set('kbn-xsrf', 'xxx')
            .send({
              agents: ['bulk-mixed-1', 'bulk-mixed-2', 'bulk-mixed-3', 'bulk-mixed-4'],
              policy_id: bulkTargetPolicyWithVersionId,
            })
            .expect(200);

          const actionId = body.actionId;

          // Wait for action to complete
          await new Promise((resolve, reject) => {
            let attempts = 0;
            const intervalId = setInterval(async () => {
              if (attempts > 10) {
                clearInterval(intervalId);
                reject(new Error('action timed out'));
                return;
              }
              ++attempts;
              const {
                body: { items: actionStatuses },
              } = await supertest.get(`/api/fleet/agents/action_status`).set('kbn-xsrf', 'xxx');

              const action = actionStatuses.find((a: any) => a.actionId === actionId);
              if (action && action.nbAgentsActioned === action.nbAgentsActionCreated) {
                clearInterval(intervalId);
                resolve({});
              }
            }, 1000);
          });

          // Check action status
          const { body: statusBody } = await supertest
            .get(`/api/fleet/agents/action_status`)
            .set('kbn-xsrf', 'xxx');
          const actionStatus = statusBody.items.find((a: any) => a.actionId === actionId);

          expect(actionStatus).to.be.ok();
          expect(actionStatus.nbAgentsActionCreated).to.eql(2); // Only compatible agents
          expect(actionStatus.nbAgentsFailed).to.eql(2); // Incompatible agents

          // Verify compatible agents were reassigned
          const [agent1data, agent3data] = await Promise.all([
            supertest.get(`/api/fleet/agents/bulk-mixed-1`).set('kbn-xsrf', 'xxx'),
            supertest.get(`/api/fleet/agents/bulk-mixed-3`).set('kbn-xsrf', 'xxx'),
          ]);
          expect(agent1data.body.item.policy_id).to.eql(bulkTargetPolicyWithVersionId);
          expect(agent3data.body.item.policy_id).to.eql(bulkTargetPolicyWithVersionId);

          // Verify incompatible agents were not reassigned
          const [agent2data, agent4data] = await Promise.all([
            supertest.get(`/api/fleet/agents/bulk-mixed-2`).set('kbn-xsrf', 'xxx'),
            supertest.get(`/api/fleet/agents/bulk-mixed-4`).set('kbn-xsrf', 'xxx'),
          ]);
          expect(agent2data.body.item.policy_id).to.eql(bulkSourcePolicyId);
          expect(agent4data.body.item.policy_id).to.eql(bulkSourcePolicyId);
        });

        it('should allow bulk reassigning when all agent versions are incompatible but force=true', async () => {
          // Create multiple agents with incompatible versions
          await fleetAndAgents.generateAgent(
            'online',
            'bulk-force-1',
            bulkSourcePolicyId,
            '8.11.0'
          );
          await fleetAndAgents.generateAgent(
            'online',
            'bulk-force-2',
            bulkSourcePolicyId,
            '8.11.0'
          );

          const { body } = await supertest
            .post(`/api/fleet/agents/bulk_reassign`)
            .set('kbn-xsrf', 'xxx')
            .send({
              agents: ['bulk-force-1', 'bulk-force-2'],
              policy_id: bulkTargetPolicyWithVersionId,
              force: true,
            })
            .expect(200);

          const actionId = body.actionId;

          // Wait for action to complete
          await new Promise((resolve, reject) => {
            let attempts = 0;
            const intervalId = setInterval(async () => {
              if (attempts > 10) {
                clearInterval(intervalId);
                reject(new Error('action timed out'));
                return;
              }
              ++attempts;
              const {
                body: { items: actionStatuses },
              } = await supertest.get(`/api/fleet/agents/action_status`).set('kbn-xsrf', 'xxx');

              const action = actionStatuses.find((a: any) => a.actionId === actionId);
              if (action && action.nbAgentsActioned === action.nbAgentsActionCreated) {
                clearInterval(intervalId);
                resolve({});
              }
            }, 1000);
          });

          // Verify all agents were reassigned despite incompatible versions
          const [agent1data, agent2data] = await Promise.all([
            supertest.get(`/api/fleet/agents/bulk-force-1`).set('kbn-xsrf', 'xxx'),
            supertest.get(`/api/fleet/agents/bulk-force-2`).set('kbn-xsrf', 'xxx'),
          ]);
          expect(agent1data.body.item.policy_id).to.eql(bulkTargetPolicyWithVersionId);
          expect(agent2data.body.item.policy_id).to.eql(bulkTargetPolicyWithVersionId);
        });

        it('should handle bulk reassigning with kuery when some agents are incompatible', async () => {
          // Create mix of compatible and incompatible agents
          await fleetAndAgents.generateAgent(
            'online',
            'bulk-kuery-1',
            bulkSourcePolicyId,
            '8.12.0'
          );
          await fleetAndAgents.generateAgent(
            'online',
            'bulk-kuery-2',
            bulkSourcePolicyId,
            '8.11.0'
          );
          await fleetAndAgents.generateAgent(
            'online',
            'bulk-kuery-3',
            bulkSourcePolicyId,
            '8.12.0'
          );

          const { body } = await supertest
            .post(`/api/fleet/agents/bulk_reassign`)
            .set('kbn-xsrf', 'xxx')
            .send({
              agents: `policy_id:${bulkSourcePolicyId}`,
              policy_id: bulkTargetPolicyWithVersionId,
            })
            .expect(200);

          const actionId = body.actionId;

          // Wait for action to complete
          await new Promise((resolve, reject) => {
            let attempts = 0;
            const intervalId = setInterval(async () => {
              if (attempts > 10) {
                clearInterval(intervalId);
                reject(new Error('action timed out'));
                return;
              }
              ++attempts;
              const {
                body: { items: actionStatuses },
              } = await supertest.get(`/api/fleet/agents/action_status`).set('kbn-xsrf', 'xxx');

              const action = actionStatuses.find((a: any) => a.actionId === actionId);
              if (action && action.nbAgentsActioned === action.nbAgentsActionCreated) {
                clearInterval(intervalId);
                resolve({});
              }
            }, 1000);
          });

          // Check action status for correct counts
          const { body: statusBody } = await supertest
            .get(`/api/fleet/agents/action_status`)
            .set('kbn-xsrf', 'xxx');
          const actionStatus = statusBody.items.find((a: any) => a.actionId === actionId);

          expect(actionStatus).to.be.ok();
          // Should have reassigned compatible agents, failed on incompatible ones
          expect(actionStatus.nbAgentsActionCreated).to.be.greaterThan(0);
          expect(actionStatus.nbAgentsFailed).to.be.greaterThan(0);

          // Verify compatible agents were reassigned
          const [agent1data, agent3data] = await Promise.all([
            supertest.get(`/api/fleet/agents/bulk-kuery-1`).set('kbn-xsrf', 'xxx'),
            supertest.get(`/api/fleet/agents/bulk-kuery-3`).set('kbn-xsrf', 'xxx'),
          ]);
          expect(agent1data.body.item.policy_id).to.eql(bulkTargetPolicyWithVersionId);
          expect(agent3data.body.item.policy_id).to.eql(bulkTargetPolicyWithVersionId);

          // Verify incompatible agent was not reassigned
          const agent2data = await supertest
            .get(`/api/fleet/agents/bulk-kuery-2`)
            .set('kbn-xsrf', 'xxx');
          expect(agent2data.body.item.policy_id).to.eql(bulkSourcePolicyId);
        });
      });
    });
  });
}
