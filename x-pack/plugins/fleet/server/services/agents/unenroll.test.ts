/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';
import type { SavedObject } from 'kibana/server';
import type { Agent, AgentPolicy } from '../../types';
import { AgentUnenrollmentError } from '../../errors';
import { unenrollAgent, unenrollAgents } from './unenroll';

const agentInManagedSO = {
  id: 'agent-in-managed-policy',
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

describe('unenrollAgent (singular)', () => {
  it('can unenroll from unmanaged policy', async () => {
    const soClient = createClientMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    await unenrollAgent(soClient, esClient, agentInUnmanagedSO.id);

    // calls ES update with correct values
    expect(soClient.update).toBeCalledTimes(1);
    const calledWith = soClient.update.mock.calls[0];
    expect(calledWith[1]).toBe(agentInUnmanagedSO.id);
    expect(calledWith[2]).toHaveProperty('unenrollment_started_at');
  });

  it('cannot unenroll from managed policy', async () => {
    const soClient = createClientMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    await expect(unenrollAgent(soClient, esClient, agentInManagedSO.id)).rejects.toThrowError(
      AgentUnenrollmentError
    );
    // does not call ES update
    expect(soClient.update).toBeCalledTimes(0);
  });
});

describe('unenrollAgents (plural)', () => {
  it('can unenroll from an unmanaged policy', async () => {
    const soClient = createClientMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const idsToUnenroll = [agentInUnmanagedSO.id, agentInUnmanagedSO2.id];
    await unenrollAgents(soClient, esClient, { agentIds: idsToUnenroll });

    // calls ES update with correct values
    const calledWith = soClient.bulkUpdate.mock.calls[0][0];
    expect(calledWith.length).toBe(idsToUnenroll.length);
    expect(calledWith.map(({ id }) => id)).toEqual(idsToUnenroll);
    for (const params of calledWith) {
      expect(params.attributes).toHaveProperty('unenrollment_started_at');
    }
  });
  it('cannot unenroll from a managed policy', async () => {
    const soClient = createClientMock();

    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const idsToUnenroll = [agentInUnmanagedSO.id, agentInManagedSO.id, agentInUnmanagedSO2.id];
    await unenrollAgents(soClient, esClient, { agentIds: idsToUnenroll });

    // calls ES update with correct values
    const calledWith = soClient.bulkUpdate.mock.calls[0][0];
    const onlyUnmanaged = [agentInUnmanagedSO.id, agentInUnmanagedSO2.id];
    expect(calledWith.length).toBe(onlyUnmanaged.length);
    expect(calledWith.map(({ id }) => id)).toEqual(onlyUnmanaged);
    for (const params of calledWith) {
      expect(params.attributes).toHaveProperty('unenrollment_started_at');
    }
  });
});

function createClientMock() {
  const soClientMock = savedObjectsClientMock.create();

  // need to mock .create & bulkCreate due to (bulk)createAgentAction(s) in unenrollAgent(s)
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
      case agentInUnmanagedSO2.id:
        return agentInUnmanagedSO2;
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
