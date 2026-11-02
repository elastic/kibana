/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENTS_INDEX, AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const es = getService('es');
  let policy1: any;

  async function createAgentWithRollback(
    agentId: string,
    rollbackVersion: string,
    validUntil?: string,
    additionalFields?: any
  ) {
    const enrolledTime = new Date(Date.now() - 1000 * 60).toISOString();
    const validUntilDate = validUntil || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await es.index({
      refresh: 'wait_for',
      index: AGENTS_INDEX,
      id: agentId,
      document: {
        id: agentId,
        type: 'PERMANENT',
        active: true,
        enrolled_at: enrolledTime,
        last_checkin: new Date().toISOString(),
        policy_id: policy1.id,
        policy_revision: 1,
        policy_revision_idx: 1,
        namespaces: ['default'],
        agent: {
          id: agentId,
          version: '9.0.0',
        },
        local_metadata: {
          elastic: {
            agent: {
              version: '9.0.0',
              upgradeable: true,
            },
          },
        },
        ...additionalFields,
        upgrade:
          additionalFields?.upgrade !== undefined
            ? additionalFields.upgrade
            : {
                rollbacks: [
                  {
                    version: rollbackVersion,
                    valid_until: validUntilDate,
                  },
                ],
              },
      },
    });
  }

  async function getLatestActionStatus() {
    const { body } = await supertest.get(`/api/fleet/agents/action_status`).set('kbn-xsrf', 'xxx');
    return body.items[0];
  }

  async function getActionIdsPerVersion(actionIds: string[]): Promise<Record<string, string[]>> {
    const versionToActionIds: Record<string, string[]> = {};
    for (const actionId of actionIds) {
      const actionsRes = await es.search({
        index: AGENT_ACTIONS_INDEX,
        query: {
          term: {
            action_id: actionId,
          },
        },
      });

      const action: any = actionsRes.hits.hits[0]._source;
      const version = action.data.version;
      if (!versionToActionIds[version]) {
        versionToActionIds[version] = [];
      }
      versionToActionIds[version].push(actionId);
    }
    return versionToActionIds;
  }

  async function getNbAgentsActioned(actionIds: string[]) {
    const { body } = await supertest.get(`/api/fleet/agents/action_status`).set('kbn-xsrf', 'xxx');
    const actionIdToNbAgentsActioned: Record<string, number> = {};
    for (const item of body.items) {
      if (actionIds.includes(item.actionId)) {
        actionIdToNbAgentsActioned[item.actionId] = item.nbAgentsActioned;
      }
    }
    return actionIdToNbAgentsActioned;
  }

  describe('fleet_agents_rollback', () => {
    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/agents');

      const policyRes = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xx')
        .send({
          name: 'Agent policy 1',
          namespace: 'default',
          description: 'Test policy 1',
          monitoring_enabled: ['logs', 'metrics'],
        })
        .expect(200);
      policy1 = policyRes.body.item;

      // Agents with same valid rollback
      await createAgentWithRollback('agent1', '9.3.0');
      await createAgentWithRollback('agent2', '9.3.0');
      await createAgentWithRollback('agent3', '9.3.0');

      // Agents with different valid rollback
      await createAgentWithRollback('agent4', '9.2.0');
      await createAgentWithRollback('agent5', '9.1.0');

      // Agent with valid rollback to IAR version
      await createAgentWithRollback('agent6', '9.3.0+build202512171030');

      // Agent with expired rollback
      await createAgentWithRollback(
        'agent7',
        '9.3.0',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      );

      // Agents without rollbacks
      await createAgentWithRollback('agent8', '9.3.0', undefined, {
        upgrade: {
          rollbacks: [],
        },
      });
      await createAgentWithRollback('agent9', '9.3.0', undefined, {
        upgrade: {
          rollbacks: [],
        },
      });

      // Agent that is unenrolling
      await createAgentWithRollback('agent10', '9.3.0', undefined, {
        unenrollment_started_at: new Date().toISOString(),
      });

      // Agent that is unenrolled
      await createAgentWithRollback('agent11', '9.3.0', undefined, {
        unenrolled_at: new Date().toISOString(),
      });

      // Agent that is currently upgrading
      await createAgentWithRollback('agent12', '9.3.0', undefined, {
        upgrade_started_at: new Date().toISOString(),
      });
    });

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/agents');
    });

    describe('POST /api/fleet/agents/{agentId}/rollback', () => {
      it('should return 200 and create UPGRADE action with rollback:true for agent with valid rollback', async () => {
        const res = await supertest
          .post(`/api/fleet/agents/agent1/rollback`)
          .set('kbn-xsrf', 'xx')
          .expect(200);

        expect(res.body).to.have.property('actionId');
        expect(res.body.actionId).to.be.a('string');

        const actionsRes = await es.search({
          index: AGENT_ACTIONS_INDEX,
          query: {
            term: {
              action_id: res.body.actionId,
            },
          },
        });

        expect(actionsRes.hits.hits.length).to.be.greaterThan(0);
        const action: any = actionsRes.hits.hits[0]._source;
        expect(action.type).to.eql('UPGRADE');
        expect(action.data.rollback).to.eql(true);
        expect(action.data.version).to.eql('9.3.0');
      });

      it('should return 200 and create UPGRADE action with rollback:true for agent with valid rollback to IAR version', async () => {
        const res = await supertest
          .post(`/api/fleet/agents/agent6/rollback`)
          .set('kbn-xsrf', 'xx')
          .expect(200);

        expect(res.body).to.have.property('actionId');
        expect(res.body.actionId).to.be.a('string');

        const actionsRes = await es.search({
          index: AGENT_ACTIONS_INDEX,
          query: {
            term: {
              action_id: res.body.actionId,
            },
          },
        });

        expect(actionsRes.hits.hits.length).to.be.greaterThan(0);
        const action: any = actionsRes.hits.hits[0]._source;
        expect(action.type).to.eql('UPGRADE');
        expect(action.data.rollback).to.eql(true);
        expect(action.data.version).to.eql('9.3.0+build202512171030');
      });

      it('should return 400 if agent has no rollbacks', async () => {
        const res = await supertest
          .post(`/api/fleet/agents/agent8/rollback`)
          .set('kbn-xsrf', 'xx')
          .expect(400);

        expect(res.body.message).to.eql(
          'Error rolling back agent in Fleet: upgrade rollback not available for agent'
        );
      });

      it('should return 400 if agent has expired rollback', async () => {
        const res = await supertest
          .post(`/api/fleet/agents/agent7/rollback`)
          .set('kbn-xsrf', 'xx')
          .expect(400);

        expect(res.body.message).to.eql(
          'Error rolling back agent in Fleet: upgrade rollback window has expired'
        );
      });

      it('should return 400 if agent is unenrolling', async () => {
        const res = await supertest
          .post(`/api/fleet/agents/agent10/rollback`)
          .set('kbn-xsrf', 'xx')
          .expect(400);

        expect(res.body.message).to.eql(
          'Error rolling back agent in Fleet: cannot roll back an unenrolling or unenrolled agent'
        );
      });

      it('should return 400 if agent is unenrolled', async () => {
        const res = await supertest
          .post(`/api/fleet/agents/agent11/rollback`)
          .set('kbn-xsrf', 'xx')
          .expect(400);

        expect(res.body.message).to.eql(
          'Error rolling back agent in Fleet: cannot roll back an unenrolling or unenrolled agent'
        );
      });

      it('should return 400 if agent is currently upgrading', async () => {
        const res = await supertest
          .post(`/api/fleet/agents/agent12/rollback`)
          .set('kbn-xsrf', 'xx')
          .expect(400);

        expect(res.body.message).to.eql(
          'Error rolling back agent in Fleet: cannot roll back an upgrading agent'
        );
      });

      it('should return 404 if agent does not exist', async () => {
        const res = await supertest
          .post(`/api/fleet/agents/agent999/rollback`)
          .set('kbn-xsrf', 'xx')
          .expect(404);
        expect(res.body.message).to.eql('Agent agent999 not found');
      });
    });

    describe('POST /api/fleet/agents/bulk_rollback', () => {
      describe('when passing a list of agent ids', () => {
        it('should create one UPGRADE action if agents with the same rollback version', async () => {
          const { body } = await supertest
            .post(`/api/fleet/agents/bulk_rollback`)
            .set('kbn-xsrf', 'xx')
            .send({
              agents: ['agent1', 'agent2', 'agent3'],
            })
            .expect(200);

          expect(body.actionIds.length).to.eql(1);

          const actionsRes = await es.search({
            index: AGENT_ACTIONS_INDEX,
            query: {
              term: {
                action_id: body.actionIds[0],
              },
            },
          });

          const action: any = actionsRes.hits.hits[0]._source;
          expect(action.type).to.eql('UPGRADE');
          expect(action.data.rollback).to.eql(true);
          expect(action.agents.length).to.eql(3);
          expect(action.agents).to.contain('agent1');
          expect(action.agents).to.contain('agent2');
          expect(action.agents).to.contain('agent3');

          const actionStatus = await getLatestActionStatus();
          expect(actionStatus.nbAgentsActioned).to.eql(3);
          expect(actionStatus.nbAgentsFailed).to.eql(0);
        });

        it('should create multiple actions if agents have different rollback versions', async () => {
          const { body } = await supertest
            .post(`/api/fleet/agents/bulk_rollback`)
            .set('kbn-xsrf', 'xx')
            .send({
              agents: ['agent1', 'agent4', 'agent5'],
            })
            .expect(200);

          expect(body.actionIds.length).to.eql(3);

          const versionToActionIds = await getActionIdsPerVersion(body.actionIds);

          expect(Object.keys(versionToActionIds).length).to.eql(3);
          expect(Object.keys(versionToActionIds)).to.contain('9.3.0');
          expect(Object.keys(versionToActionIds)).to.contain('9.2.0');
          expect(Object.keys(versionToActionIds)).to.contain('9.1.0');
        });

        it('should create errors for agents with no valid rollback', async () => {
          const { body } = await supertest
            .post(`/api/fleet/agents/bulk_rollback`)
            .set('kbn-xsrf', 'xx')
            .send({
              agents: ['agent1', 'agent7', 'agent8'],
            })
            .expect(200);

          // agent1 (valid) and agent7 (expired) both have rollback version "9.3.0", so they share the same action
          // agent8 (no rollback) error is assigned to the first action (pre-action error)
          expect(body.actionIds.length).to.eql(1);

          const actionStatus = await getLatestActionStatus();
          expect(actionStatus.nbAgentsFailed).to.eql(2);
          expect(actionStatus.latestErrors.length).to.eql(2);

          const errorMessages = actionStatus.latestErrors.map((e: any) => e.error);
          expect(errorMessages).to.contain(
            'Error rolling back agent in Fleet: upgrade rollback not available for agent'
          );
          expect(errorMessages).to.contain(
            'Error rolling back agent in Fleet: upgrade rollback window has expired'
          );
        });

        it('should create error-only action when no agents have rollbacks', async () => {
          const { body } = await supertest
            .post(`/api/fleet/agents/bulk_rollback`)
            .set('kbn-xsrf', 'xx')
            .send({
              agents: ['agent8', 'agent9'],
            })
            .expect(200);

          expect(body.actionIds.length).to.eql(1);

          const actionsRes = await es.search({
            index: AGENT_ACTIONS_INDEX,
            query: {
              term: {
                action_id: body.actionIds[0],
              },
            },
          });

          const action: any = actionsRes.hits.hits[0]._source;
          expect(action.type).to.eql('UPGRADE');
          expect(action.data.rollback).to.eql(true);
          expect(action.agents).to.eql([]);
          expect(action.total).to.eql(2);

          const actionStatus = await getLatestActionStatus();
          expect(actionStatus.nbAgentsFailed).to.eql(2);
          expect(actionStatus.latestErrors.length).to.eql(2);
          const errorMessages = actionStatus.latestErrors.map((e: any) => e.error);
          expect(errorMessages).to.eql([
            'Error rolling back agent in Fleet: upgrade rollback not available for agent',
            'Error rolling back agent in Fleet: upgrade rollback not available for agent',
          ]);
        });
      });

      describe('when passing an agent kuery', () => {
        it('should create multiple actions for agents with different rollback versions', async () => {
          const { body } = await supertest
            .post(`/api/fleet/agents/bulk_rollback`)
            .set('kbn-xsrf', 'xxx')
            .send({
              agents: `policy_id: "${policy1.id}"`,
            })
            .expect(200);
          expect(body.actionIds.length).to.eql(4);

          const versionToActionIds = await getActionIdsPerVersion(body.actionIds);

          expect(Object.keys(versionToActionIds).length).to.eql(4);
          expect(Object.keys(versionToActionIds)).to.contain('9.3.0');
          expect(versionToActionIds['9.3.0'].length).to.eql(1);
          expect(Object.keys(versionToActionIds)).to.contain('9.2.0');
          expect(versionToActionIds['9.2.0'].length).to.eql(1);
          expect(Object.keys(versionToActionIds)).to.contain('9.1.0');
          expect(versionToActionIds['9.1.0'].length).to.eql(1);
          expect(Object.keys(versionToActionIds)).to.contain('9.3.0+build202512171030');
          expect(versionToActionIds['9.3.0+build202512171030'].length).to.eql(1);

          const actionIdToNbAgentsActioned = await getNbAgentsActioned(body.actionIds);
          expect(actionIdToNbAgentsActioned[versionToActionIds['9.3.0'][0]]).to.eql(6);
          expect(actionIdToNbAgentsActioned[versionToActionIds['9.2.0'][0]]).to.eql(1);
          expect(actionIdToNbAgentsActioned[versionToActionIds['9.1.0'][0]]).to.eql(1);
          expect(
            actionIdToNbAgentsActioned[versionToActionIds['9.3.0+build202512171030'][0]]
          ).to.eql(1);
        });

        it('should handle agent batches correctly', async () => {
          const { body } = await supertest
            .post(`/api/fleet/agents/bulk_rollback`)
            .set('kbn-xsrf', 'xxx')
            .send({
              agents: `policy_id: "${policy1.id}"`,
              batchSize: 2,
            })
            .expect(200);

          // 6 agents with 9.3.0 rollback version -> min 3 actions, max 6 actions
          // 1 agent with 9.2.0 rollback version -> 1 action
          // 1 agent with 9.1.0 rollback version-> 1 action
          // 1 agent with IAR rollback version-> 1 action
          expect(body.actionIds.length).to.be.greaterThan(6);
          expect(body.actionIds.length).to.be.lessThan(10);

          const versionToActionIds = await getActionIdsPerVersion(body.actionIds);

          expect(Object.keys(versionToActionIds).length).to.eql(4);
          expect(Object.keys(versionToActionIds)).to.contain('9.3.0');
          expect(versionToActionIds['9.3.0'].length).to.be.greaterThan(2);
          expect(versionToActionIds['9.3.0'].length).to.be.lessThan(7);
          expect(Object.keys(versionToActionIds)).to.contain('9.2.0');
          expect(versionToActionIds['9.2.0'].length).to.eql(1);
          expect(Object.keys(versionToActionIds)).to.contain('9.1.0');
          expect(versionToActionIds['9.1.0'].length).to.eql(1);
          expect(Object.keys(versionToActionIds)).to.contain('9.3.0+build202512171030');
          expect(versionToActionIds['9.3.0+build202512171030'].length).to.eql(1);

          const actionIdToNbAgentsActioned = await getNbAgentsActioned(body.actionIds);
          for (const actionId of versionToActionIds['9.3.0']) {
            expect(actionIdToNbAgentsActioned[actionId]).to.be.greaterThan(0);
            expect(actionIdToNbAgentsActioned[actionId]).to.be.lessThan(3);
          }
          expect(actionIdToNbAgentsActioned[versionToActionIds['9.2.0'][0]]).to.eql(1);
          expect(actionIdToNbAgentsActioned[versionToActionIds['9.1.0'][0]]).to.eql(1);
          expect(
            actionIdToNbAgentsActioned[versionToActionIds['9.3.0+build202512171030'][0]]
          ).to.eql(1);
        });
      });
    });
  });
}
