/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENT_POLICY_INDEX, CreateAgentPolicyResponse } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import {
  cleanFleetActionIndices,
  cleanFleetAgentPolicies,
  cleanFleetIndices,
  createFleetAgent,
} from './helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  let TEST_SPACE_1: string;

  describe('actions', function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClient = new SpaceTestApiClient(supertest);

    before(async () => {
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);

      await apiClient.postEnableSpaceAwareness();

      const [_defaultSpacePolicy1, _spaceTest1Policy1, _spaceTest1Policy2] = await Promise.all([
        apiClient.createAgentPolicy(),
        apiClient.createAgentPolicy(TEST_SPACE_1),
        apiClient.createAgentPolicy(TEST_SPACE_1),
      ]);
      defaultSpacePolicy1 = _defaultSpacePolicy1;
      spaceTest1Policy1 = _spaceTest1Policy1;
      spaceTest1Policy2 = _spaceTest1Policy2;

      const [_defaultSpaceAgent1, _defaultSpaceAgent2, _testSpaceAgent1, _testSpaceAgent2] =
        await Promise.all([
          createFleetAgent(esClient, defaultSpacePolicy1.item.id, 'default'),
          createFleetAgent(esClient, defaultSpacePolicy1.item.id),
          createFleetAgent(esClient, spaceTest1Policy1.item.id, TEST_SPACE_1),
          createFleetAgent(esClient, spaceTest1Policy2.item.id, TEST_SPACE_1),
        ]);
      defaultSpaceAgent1 = _defaultSpaceAgent1;
      defaultSpaceAgent2 = _defaultSpaceAgent2;
      testSpaceAgent1 = _testSpaceAgent1;
      testSpaceAgent2 = _testSpaceAgent2;

      await spaces.createTestSpace(TEST_SPACE_1);
    });

    beforeEach(async () => {
      await cleanFleetActionIndices(esClient);
      await cleanFleetAgentPolicies(esClient);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    let defaultSpacePolicy1: CreateAgentPolicyResponse;
    let spaceTest1Policy1: CreateAgentPolicyResponse;
    let spaceTest1Policy2: CreateAgentPolicyResponse;

    let defaultSpaceAgent1: string;
    let defaultSpaceAgent2: string;
    let testSpaceAgent1: string;
    let testSpaceAgent2: string;

    describe('GET /agents/action_status', () => {
      it('should return agent actions in the default space', async () => {
        // Create UPDATE_TAGS action for agents in default space
        await apiClient.bulkUpdateAgentTags({
          agents: [defaultSpaceAgent1, defaultSpaceAgent2],
          tagsToAdd: ['tag1'],
        });

        const actionStatusInDefaultSpace = await apiClient.getActionStatus();
        expect(actionStatusInDefaultSpace.items.length).to.eql(1);
        expect(actionStatusInDefaultSpace.items[0]).to.have.keys(
          'type',
          'status',
          'nbAgentsActionCreated',
          'nbAgentsAck',
          'nbAgentsActioned',
          'nbAgentsFailed',
          'latestErrors'
        );
        expect(actionStatusInDefaultSpace.items[0].type).to.eql('UPDATE_TAGS');
        expect(actionStatusInDefaultSpace.items[0].nbAgentsActioned).to.eql(2);
        expect(actionStatusInDefaultSpace.items[0].nbAgentsActionCreated).to.eql(2);
        expect(actionStatusInDefaultSpace.items[0].status).to.eql('COMPLETE');

        const actionStatusInCustomSpace = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatusInCustomSpace.items.length).to.eql(0);
      });

      it('should return agent actions in a custom space', async () => {
        // Create UPDATE_TAGS action for agents in custom space
        await apiClient.bulkUpdateAgentTags(
          {
            agents: [testSpaceAgent1, testSpaceAgent2],
            tagsToAdd: ['tag1'],
          },
          TEST_SPACE_1
        );

        const actionStatusInDefaultSpace = await apiClient.getActionStatus();
        expect(actionStatusInDefaultSpace.items.length).to.eql(0);

        const actionStatusInCustomSpace = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatusInCustomSpace.items.length).to.eql(1);
        expect(actionStatusInCustomSpace.items[0]).to.have.keys(
          'type',
          'status',
          'nbAgentsActionCreated',
          'nbAgentsAck',
          'nbAgentsActioned',
          'nbAgentsFailed',
          'latestErrors'
        );
        expect(actionStatusInCustomSpace.items[0].type).to.eql('UPDATE_TAGS');
        expect(actionStatusInCustomSpace.items[0].nbAgentsActioned).to.eql(2);
        expect(actionStatusInCustomSpace.items[0].nbAgentsActionCreated).to.eql(2);
        expect(actionStatusInCustomSpace.items[0].status).to.eql('COMPLETE');
      });

      it('should return agent policy actions in the default space', async () => {
        // Index agent policy document with no namespaces
        // TODO: can this be done by updating the agent policy using the API? The .fleet-policies index remains empty...
        await esClient.index({
          refresh: 'wait_for',
          index: AGENT_POLICY_INDEX,
          document: {
            revision_idx: 2,
            policy_id: defaultSpacePolicy1.item.id,
            coordinator_idx: 0,
            '@timestamp': '2024-07-31T13:00:00.000Z',
          },
        });

        // Index agent policy document in the default space
        // TODO: can this be done by updating the agent policy using the API? The .fleet-policies index remains empty...
        await esClient.index({
          refresh: 'wait_for',
          index: AGENT_POLICY_INDEX,
          document: {
            revision_idx: 2,
            policy_id: defaultSpacePolicy1.item.id,
            coordinator_idx: 0,
            '@timestamp': '2024-07-31T13:00:00.000Z',
            namespaces: ['default'],
          },
        });

        const actionStatusInDefaultSpace = await apiClient.getActionStatus();
        expect(actionStatusInDefaultSpace.items.length).to.eql(1);
        expect(actionStatusInDefaultSpace.items[0]).to.have.keys(
          'type',
          'status',
          'nbAgentsActionCreated',
          'nbAgentsAck',
          'nbAgentsActioned',
          'nbAgentsFailed'
        );
        expect(actionStatusInDefaultSpace.items[0].type).to.eql('POLICY_CHANGE');
        expect(actionStatusInDefaultSpace.items[0].nbAgentsActionCreated).to.eql(2);
        expect(actionStatusInDefaultSpace.items[0].nbAgentsActioned).to.eql(2);

        const actionStatusInCustomSpace = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatusInCustomSpace.items.length).to.eql(0);
      });

      it('should return agent policy actions in a custom space', async () => {
        // Index agent policy document in a custom space
        // TODO: can this be done by updating the agent policy using the API? The .fleet-policies index remains empty...
        await esClient.index({
          refresh: 'wait_for',
          index: AGENT_POLICY_INDEX,
          document: {
            revision_idx: 2,
            policy_id: defaultSpacePolicy1.item.id,
            coordinator_idx: 0,
            '@timestamp': '2024-07-31T13:00:00.000Z',
            namespaces: [TEST_SPACE_1],
          },
        });

        const actionStatusInDefaultSpace = await apiClient.getActionStatus();
        expect(actionStatusInDefaultSpace.items.length).to.eql(0);

        const actionStatusInCustomSpace = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatusInCustomSpace.items.length).to.eql(1);
        expect(actionStatusInCustomSpace.items[0]).to.have.keys(
          'type',
          'status',
          'nbAgentsActionCreated',
          'nbAgentsAck',
          'nbAgentsActioned',
          'nbAgentsFailed'
        );
        expect(actionStatusInCustomSpace.items[0].type).to.eql('POLICY_CHANGE');
        expect(actionStatusInCustomSpace.items[0].nbAgentsActionCreated).to.eql(2);
        expect(actionStatusInCustomSpace.items[0].nbAgentsActioned).to.eql(2);
      });
    });

    describe('POST /agents/{agentId}/actions', () => {
      it('should return 404 if the agent is not in the current space', async () => {
        const resInDefaultSpace = await supertest
          .post(`/api/fleet/agents/${testSpaceAgent1}/actions`)
          .set('kbn-xsrf', 'xxxx')
          .send({ action: { type: 'UNENROLL' } })
          .expect(404);
        expect(resInDefaultSpace.body.message).to.eql(`Agent ${testSpaceAgent1} not found`);

        const resInCustomSpace = await supertest
          .post(`/s/${TEST_SPACE_1}/api/fleet/agents/${defaultSpaceAgent1}/actions`)
          .set('kbn-xsrf', 'xxxx')
          .send({ action: { type: 'UNENROLL' } })
          .expect(404);
        expect(resInCustomSpace.body.message).to.eql(`Agent ${defaultSpaceAgent1} not found`);
      });

      it('should create an action with set namespace in the default space', async () => {
        await apiClient.postNewAgentAction(defaultSpaceAgent1);

        const actionStatusInDefaultSpace = await apiClient.getActionStatus();
        expect(actionStatusInDefaultSpace.items.length).to.eql(1);

        const actionStatusInCustomSpace = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatusInCustomSpace.items.length).to.eql(0);
      });

      it('should create an action with set namespace in a custom space', async () => {
        await apiClient.postNewAgentAction(testSpaceAgent1, TEST_SPACE_1);

        const actionStatusInDefaultSpace = await apiClient.getActionStatus();
        expect(actionStatusInDefaultSpace.items.length).to.eql(0);

        const actionStatusInCustomSpace = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatusInCustomSpace.items.length).to.eql(1);
      });
    });

    describe('POST /agents/actions/{actionId}/cancel', () => {
      it('should return 200 and a CANCEL action if the action is in the same space', async () => {
        // Create UPDATE_TAGS action for agents in custom space
        await apiClient.bulkUpdateAgentTags(
          {
            agents: [testSpaceAgent1, testSpaceAgent2],
            tagsToAdd: ['tag1'],
          },
          TEST_SPACE_1
        );

        const actionStatusInCustomSpace = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatusInCustomSpace.items.length).to.eql(1);

        const res = await apiClient.cancelAction(
          actionStatusInCustomSpace.items[0].actionId,
          TEST_SPACE_1
        );
        expect(res.item.type).to.eql('CANCEL');
      });

      it('should return 404 if the action is in a different space', async () => {
        // Create UPDATE_TAGS action for agents in custom space
        await apiClient.bulkUpdateAgentTags(
          {
            agents: [testSpaceAgent1, testSpaceAgent2],
            tagsToAdd: ['tag1'],
          },
          TEST_SPACE_1
        );

        const actionStatusInCustomSpace = await apiClient.getActionStatus(TEST_SPACE_1);
        expect(actionStatusInCustomSpace.items.length).to.eql(1);

        let err: Error | undefined;
        try {
          await apiClient.cancelAction(actionStatusInCustomSpace.items[0].actionId);
        } catch (_err) {
          err = _err;
        }

        expect(err).to.be.an(Error);
        expect(err?.message).to.match(/404 "Not Found"/);
      });
    });
  });
}
