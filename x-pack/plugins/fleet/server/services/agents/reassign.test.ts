/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';
import type { SavedObject } from 'kibana/server';

import type { AgentPolicy } from '../../types';
import { AgentReassignmentError } from '../../errors';

import { reassignAgent, reassignAgents } from './reassign';

const agentInManagedDoc = {
  _id: 'agent-in-managed-policy',
  _source: { policy_id: 'managed-agent-policy' },
};
const agentInManagedDoc2 = {
  _id: 'agent-in-managed-policy2',
  _source: { policy_id: 'managed-agent-policy' },
};
const agentInUnmanagedDoc = {
  _id: 'agent-in-unmanaged-policy',
  _source: { policy_id: 'unmanaged-agent-policy' },
};
const unmanagedAgentPolicySO = {
  id: 'unmanaged-agent-policy',
  attributes: { is_managed: false },
} as SavedObject<AgentPolicy>;
const unmanagedAgentPolicySO2 = {
  id: 'unmanaged-agent-policy-2',
  attributes: { is_managed: false },
} as SavedObject<AgentPolicy>;
const managedAgentPolicySO = {
  id: 'managed-agent-policy',
  attributes: { is_managed: true },
} as SavedObject<AgentPolicy>;

describe('reassignAgent (singular)', () => {
  it('can reassign from unmanaged policy to unmanaged', async () => {
    const { soClient, esClient } = createClientsMock();
    await reassignAgent(soClient, esClient, agentInUnmanagedDoc._id, unmanagedAgentPolicySO.id);

    // calls ES update with correct values
    expect(esClient.update).toBeCalledTimes(1);
    const calledWith = esClient.update.mock.calls[0];
    expect(calledWith[0]?.id).toBe(agentInUnmanagedDoc._id);
    expect(calledWith[0]?.body?.doc).toHaveProperty('policy_id', unmanagedAgentPolicySO.id);
  });

  it('cannot reassign from unmanaged policy to managed', async () => {
    const { soClient, esClient } = createClientsMock();
    await expect(
      reassignAgent(soClient, esClient, agentInUnmanagedDoc._id, managedAgentPolicySO.id)
    ).rejects.toThrowError(AgentReassignmentError);

    // does not call ES update
    expect(esClient.update).toBeCalledTimes(0);
  });

  it('cannot reassign from managed policy', async () => {
    const { soClient, esClient } = createClientsMock();
    await expect(
      reassignAgent(soClient, esClient, agentInManagedDoc._id, unmanagedAgentPolicySO.id)
    ).rejects.toThrowError(AgentReassignmentError);
    // does not call ES update
    expect(esClient.update).toBeCalledTimes(0);

    await expect(
      reassignAgent(soClient, esClient, agentInManagedDoc._id, managedAgentPolicySO.id)
    ).rejects.toThrowError(AgentReassignmentError);
    // does not call ES update
    expect(esClient.update).toBeCalledTimes(0);
  });
});

describe('reassignAgents (plural)', () => {
  it('agents in managed policies are not updated', async () => {
    const { soClient, esClient } = createClientsMock();
    const idsToReassign = [agentInUnmanagedDoc._id, agentInManagedDoc._id, agentInManagedDoc2._id];
    await reassignAgents(
      soClient,
      esClient,
      { agentIds: idsToReassign },
      unmanagedAgentPolicySO2.id
    );

    // calls ES update with correct values
    const calledWith = esClient.bulk.mock.calls[0][0];
    // only 1 are unmanaged and bulk write two line per update
    expect(calledWith.body.length).toBe(2);
    // @ts-expect-error
    expect(calledWith.body[0].update._id).toEqual(agentInUnmanagedDoc._id);
  });
});

function createClientsMock() {
  const soClientMock = savedObjectsClientMock.create();

  // need to mock .create & bulkCreate due to (bulk)createAgentAction(s) in reassignAgent(s)
  // @ts-expect-error
  soClientMock.create.mockResolvedValue({ attributes: { agent_id: 'test' } });
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
      case unmanagedAgentPolicySO2.id:
        return unmanagedAgentPolicySO2;
      default:
        throw new Error(`${id} not found`);
    }
  });
  soClientMock.bulkGet.mockImplementation(async (options) => {
    return {
      saved_objects: await Promise.all(options!.map(({ type, id }) => soClientMock.get(type, id))),
    };
  });

  const esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
  // @ts-expect-error
  esClientMock.mget.mockImplementation(async () => {
    return {
      body: {
        docs: [agentInManagedDoc, agentInUnmanagedDoc, agentInManagedDoc2],
      },
    };
  });
  // @ts-expect-error
  esClientMock.get.mockImplementation(async ({ id }) => {
    switch (id) {
      case agentInManagedDoc._id:
        return { body: agentInManagedDoc };
      case agentInUnmanagedDoc._id:
        return { body: agentInUnmanagedDoc };
      default:
        throw new Error(`${id} not found`);
    }
  });
  esClientMock.bulk.mockResolvedValue({
    // @ts-expect-error not full interface
    body: { items: [] },
  });

  return { soClient: soClientMock, esClient: esClientMock };
}
