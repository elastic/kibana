/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';
import type { SavedObject } from 'kibana/server';
import type { Agent, AgentPolicy } from '../../types';
import { AgentReassignmentError } from '../../errors';
import { reassignAgent, reassignAgents } from './reassign';

const agentInManagedSO = {
  id: 'agent-in-managed-policy',
  attributes: { policy_id: 'managed-agent-policy' },
} as SavedObject<Agent>;
const agentInManagedSO2 = {
  id: 'agent-in-managed-policy2',
  attributes: { policy_id: 'managed-agent-policy' },
} as SavedObject<Agent>;
const agentInUnmanagedSO = {
  id: 'agent-in-unmanaged-policy',
  attributes: { policy_id: 'unmanaged-agent-policy' },
} as SavedObject<Agent>;
const agentInUnmanagedSO2 = {
  id: 'agent-in-unmanaged-policy2',
  attributes: { policy_id: 'unmanaged-agent-policy' },
} as SavedObject<Agent>;
const unmanagedAgentPolicySO = {
  id: 'unmanaged-agent-policy',
  attributes: { is_managed: false },
} as SavedObject<AgentPolicy>;
const managedAgentPolicySO = {
  id: 'managed-agent-policy',
  attributes: { is_managed: true },
} as SavedObject<AgentPolicy>;

describe('reassignAgent (singular)', () => {
  it('can reassign from unmanaged policy to unmanaged', async () => {
    const soClient = createClientMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    await reassignAgent(soClient, esClient, agentInUnmanagedSO.id, agentInUnmanagedSO2.id);

    // calls ES update with correct values
    expect(soClient.update).toBeCalledTimes(1);
    const calledWith = soClient.update.mock.calls[0];
    expect(calledWith[1]).toBe(agentInUnmanagedSO.id);
    expect(calledWith[2]).toHaveProperty('policy_id', agentInUnmanagedSO2.id);
  });

  it('cannot reassign from unmanaged policy to managed', async () => {
    const soClient = createClientMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    await expect(
      reassignAgent(
        soClient,
        esClient,
        agentInUnmanagedSO.id,
        agentInManagedSO.attributes.policy_id!
      )
    ).rejects.toThrowError(AgentReassignmentError);

    // does not call ES update
    expect(soClient.update).toBeCalledTimes(0);
  });

  it('cannot reassign from managed policy', async () => {
    const soClient = createClientMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    await expect(
      reassignAgent(soClient, esClient, agentInManagedSO.id, agentInManagedSO2.id)
    ).rejects.toThrowError(AgentReassignmentError);
    // does not call ES update
    expect(soClient.update).toBeCalledTimes(0);

    await expect(
      reassignAgent(soClient, esClient, agentInManagedSO.id, agentInUnmanagedSO.id)
    ).rejects.toThrowError(AgentReassignmentError);
    // does not call ES update
    expect(soClient.update).toBeCalledTimes(0);
  });
});

describe('reassignAgents (plural)', () => {
  it('agents in managed policies are not updated', async () => {
    const soClient = createClientMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const idsToReassign = [agentInUnmanagedSO.id, agentInManagedSO.id, agentInUnmanagedSO.id];
    await reassignAgents(soClient, esClient, { agentIds: idsToReassign }, agentInUnmanagedSO.id);

    // calls ES update with correct values
    const calledWith = soClient.bulkUpdate.mock.calls[0][0];
    const expectedResults = [agentInUnmanagedSO.id, agentInUnmanagedSO.id];
    expect(calledWith.length).toBe(expectedResults.length); // only 2 are unmanaged
    expect(calledWith.map(({ id }) => id)).toEqual(expectedResults);
  });
});

function createClientMock() {
  const soClientMock = savedObjectsClientMock.create();

  // need to mock .create & bulkCreate due to (bulk)createAgentAction(s) in reassignAgent(s)
  soClientMock.create.mockResolvedValue(agentInUnmanagedSO);
  soClientMock.bulkCreate.mockImplementation(async ([{ type, attributes }]) => {
    return {
      saved_objects: [await soClientMock.create(type, attributes)],
    };
  });
  soClientMock.bulkUpdate.mockResolvedValue({
    saved_objects: [],
  });

  soClientMock.get.mockImplementation(async (_, id) => {
    switch (id) {
      case unmanagedAgentPolicySO.id:
        return unmanagedAgentPolicySO;
      case managedAgentPolicySO.id:
        return managedAgentPolicySO;
      case agentInManagedSO.id:
        return agentInManagedSO;
      case agentInUnmanagedSO.id:
      default:
        return agentInUnmanagedSO;
    }
  });

  soClientMock.bulkGet.mockImplementation(async (options) => {
    return {
      saved_objects: await Promise.all(options!.map(({ type, id }) => soClientMock.get(type, id))),
    };
  });

  return soClientMock;
}
