/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';
import type { SavedObject } from 'kibana/server';

import type { AgentPolicy } from '../../types';
import { AgentUnenrollmentError } from '../../errors';

import { unenrollAgent, unenrollAgents } from './unenroll';

const agentInManagedDoc = {
  _id: 'agent-in-managed-policy',
  _source: { policy_id: 'managed-agent-policy' },
};
const agentInUnmanagedDoc = {
  _id: 'agent-in-unmanaged-policy',
  _source: { policy_id: 'unmanaged-agent-policy' },
};
const agentInUnmanagedDoc2 = {
  _id: 'agent-in-unmanaged-policy2',
  _source: { policy_id: 'unmanaged-agent-policy' },
};
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
    const { soClient, esClient } = createClientMock();
    await unenrollAgent(soClient, esClient, agentInUnmanagedDoc._id);

    // calls ES update with correct values
    expect(esClient.update).toBeCalledTimes(1);
    const calledWith = esClient.update.mock.calls[0];
    expect(calledWith[0]?.id).toBe(agentInUnmanagedDoc._id);
    expect(calledWith[0]?.body).toHaveProperty('doc.unenrollment_started_at');
  });

  it('cannot unenroll from managed policy', async () => {
    const { soClient, esClient } = createClientMock();
    await expect(unenrollAgent(soClient, esClient, agentInManagedDoc._id)).rejects.toThrowError(
      AgentUnenrollmentError
    );
    // does not call ES update
    expect(esClient.update).toBeCalledTimes(0);
  });
});

describe('unenrollAgents (plural)', () => {
  it('can unenroll from an unmanaged policy', async () => {
    const { soClient, esClient } = createClientMock();
    const idsToUnenroll = [agentInUnmanagedDoc._id, agentInUnmanagedDoc2._id];
    await unenrollAgents(soClient, esClient, { agentIds: idsToUnenroll });

    // calls ES update with correct values
    const calledWith = esClient.bulk.mock.calls[1][0];
    const ids = calledWith?.body
      .filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = calledWith?.body.filter((i: any) => i.doc).map((i: any) => i.doc);
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(idsToUnenroll);
    for (const doc of docs) {
      expect(doc).toHaveProperty('unenrollment_started_at');
    }
  });
  it('cannot unenroll from a managed policy', async () => {
    const { soClient, esClient } = createClientMock();

    const idsToUnenroll = [
      agentInUnmanagedDoc._id,
      agentInManagedDoc._id,
      agentInUnmanagedDoc2._id,
    ];
    await unenrollAgents(soClient, esClient, { agentIds: idsToUnenroll });

    // calls ES update with correct values
    const onlyUnmanaged = [agentInUnmanagedDoc._id, agentInUnmanagedDoc2._id];
    const calledWith = esClient.bulk.mock.calls[1][0];
    const ids = calledWith?.body
      .filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = calledWith?.body.filter((i: any) => i.doc).map((i: any) => i.doc);
    expect(ids).toHaveLength(onlyUnmanaged.length);
    expect(ids).toEqual(onlyUnmanaged);
    for (const doc of docs) {
      expect(doc).toHaveProperty('unenrollment_started_at');
    }
  });
});

function createClientMock() {
  const soClientMock = savedObjectsClientMock.create();

  // need to mock .create & bulkCreate due to (bulk)createAgentAction(s) in unenrollAgent(s)
  // @ts-expect-error
  soClientMock.create.mockResolvedValue({ attributes: { agent_id: 'tata' } });
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
      default:
        throw new Error('not found');
    }
  });

  soClientMock.bulkGet.mockImplementation(async (options) => {
    return {
      saved_objects: await Promise.all(options!.map(({ type, id }) => soClientMock.get(type, id))),
    };
  });

  const esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
  // @ts-expect-error
  esClientMock.get.mockImplementation(async ({ id }) => {
    switch (id) {
      case agentInManagedDoc._id:
        return { body: agentInManagedDoc };
      case agentInUnmanagedDoc2._id:
        return { body: agentInUnmanagedDoc2 };
      case agentInUnmanagedDoc._id:
        return { body: agentInUnmanagedDoc };
      default:
        throw new Error('not found');
    }
  });
  esClientMock.bulk.mockResolvedValue({
    // @ts-expect-error not full interface
    body: { items: [] },
  });

  // @ts-expect-error
  esClientMock.mget.mockImplementation(async (params) => {
    // @ts-expect-error
    const docs = params?.body.docs.map(({ _id }) => {
      switch (_id) {
        case agentInManagedDoc._id:
          return agentInManagedDoc;
        case agentInUnmanagedDoc2._id:
          return agentInUnmanagedDoc2;
        case agentInUnmanagedDoc._id:
          return agentInUnmanagedDoc;
        default:
          throw new Error('not found');
      }
    });
    return {
      body: {
        docs,
      },
    };
  });

  return { soClient: soClientMock, esClient: esClientMock };
}
