/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { SavedObject } from '@kbn/core/server';

import type { AgentPolicy } from '../../types';
import { HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import { unenrollAgent, unenrollAgents } from './unenroll';

const agentInHostedDoc = {
  _id: 'agent-in-hosted-policy',
  _source: { policy_id: 'hosted-agent-policy' },
};
const agentInRegularDoc = {
  _id: 'agent-in-regular-policy',
  _source: { policy_id: 'regular-agent-policy' },
};
const agentInRegularDoc2 = {
  _id: 'agent-in-regular-policy2',
  _source: { policy_id: 'regular-agent-policy' },
};
const regularAgentPolicySO = {
  id: 'regular-agent-policy',
  attributes: { is_managed: false },
} as SavedObject<AgentPolicy>;
const hostedAgentPolicySO = {
  id: 'hosted-agent-policy',
  attributes: { is_managed: true },
} as SavedObject<AgentPolicy>;

describe('unenrollAgent (singular)', () => {
  it('can unenroll from regular agent policy', async () => {
    const { soClient, esClient } = createClientMock();
    await unenrollAgent(soClient, esClient, agentInRegularDoc._id);

    // calls ES update with correct values
    expect(esClient.update).toBeCalledTimes(1);
    const calledWith = esClient.update.mock.calls[0];
    expect(calledWith[0]?.id).toBe(agentInRegularDoc._id);
    expect((calledWith[0] as estypes.UpdateRequest)?.body).toHaveProperty(
      'doc.unenrollment_started_at'
    );
  });

  it('cannot unenroll from hosted agent policy by default', async () => {
    const { soClient, esClient } = createClientMock();
    await expect(unenrollAgent(soClient, esClient, agentInHostedDoc._id)).rejects.toThrowError(
      HostedAgentPolicyRestrictionRelatedError
    );
    // does not call ES update
    expect(esClient.update).toBeCalledTimes(0);
  });

  it('cannot unenroll from hosted agent policy with revoke=true', async () => {
    const { soClient, esClient } = createClientMock();
    await expect(
      unenrollAgent(soClient, esClient, agentInHostedDoc._id, { revoke: true })
    ).rejects.toThrowError(HostedAgentPolicyRestrictionRelatedError);
    // does not call ES update
    expect(esClient.update).toBeCalledTimes(0);
  });

  it('can unenroll from hosted agent policy with force=true', async () => {
    const { soClient, esClient } = createClientMock();
    await unenrollAgent(soClient, esClient, agentInHostedDoc._id, { force: true });
    // calls ES update with correct values
    expect(esClient.update).toBeCalledTimes(1);
    const calledWith = esClient.update.mock.calls[0];
    expect(calledWith[0]?.id).toBe(agentInHostedDoc._id);
    expect((calledWith[0] as estypes.UpdateRequest)?.body).toHaveProperty(
      'doc.unenrollment_started_at'
    );
  });

  it('can unenroll from hosted agent policy with force=true and revoke=true', async () => {
    const { soClient, esClient } = createClientMock();
    await unenrollAgent(soClient, esClient, agentInHostedDoc._id, { force: true, revoke: true });
    // calls ES update with correct values
    expect(esClient.update).toBeCalledTimes(1);
    const calledWith = esClient.update.mock.calls[0];
    expect(calledWith[0]?.id).toBe(agentInHostedDoc._id);
    expect((calledWith[0] as estypes.UpdateRequest)?.body).toHaveProperty('doc.unenrolled_at');
  });
});

describe('unenrollAgents (plural)', () => {
  it('can unenroll from an regular agent policy', async () => {
    const { soClient, esClient } = createClientMock();
    const idsToUnenroll = [agentInRegularDoc._id, agentInRegularDoc2._id];
    await unenrollAgents(soClient, esClient, { agentIds: idsToUnenroll });

    // calls ES update with correct values
    const calledWith = esClient.bulk.mock.calls[1][0];
    const ids = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.doc)
      .map((i: any) => i.doc);
    expect(ids).toEqual(idsToUnenroll);
    for (const doc of docs!) {
      expect(doc).toHaveProperty('unenrollment_started_at');
    }
  });
  it('cannot unenroll from a hosted agent policy by default', async () => {
    const { soClient, esClient } = createClientMock();

    const idsToUnenroll = [agentInRegularDoc._id, agentInHostedDoc._id, agentInRegularDoc2._id];
    await unenrollAgents(soClient, esClient, { agentIds: idsToUnenroll });

    // calls ES update with correct values
    const onlyRegular = [agentInRegularDoc._id, agentInRegularDoc2._id];
    const calledWith = esClient.bulk.mock.calls[1][0];
    const ids = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.doc)
      .map((i: any) => i.doc);
    expect(ids).toEqual(onlyRegular);
    for (const doc of docs!) {
      expect(doc).toHaveProperty('unenrollment_started_at');
    }
  });

  it('cannot unenroll from a hosted agent policy with revoke=true', async () => {
    const { soClient, esClient } = createClientMock();

    const idsToUnenroll = [agentInRegularDoc._id, agentInHostedDoc._id, agentInRegularDoc2._id];

    const unenrolledResponse = await unenrollAgents(soClient, esClient, {
      agentIds: idsToUnenroll,
      revoke: true,
    });

    expect(unenrolledResponse.items).toMatchObject([
      {
        id: 'agent-in-regular-policy',
        success: true,
      },
      {
        id: 'agent-in-hosted-policy',
        success: false,
      },
      {
        id: 'agent-in-regular-policy2',
        success: true,
      },
    ]);

    // calls ES update with correct values
    const onlyRegular = [agentInRegularDoc._id, agentInRegularDoc2._id];
    const calledWith = esClient.bulk.mock.calls[0][0];
    const ids = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.doc)
      .map((i: any) => i.doc);
    expect(ids).toEqual(onlyRegular);
    for (const doc of docs!) {
      expect(doc).toHaveProperty('unenrolled_at');
    }
  });

  it('can unenroll from hosted agent policy with force=true', async () => {
    const { soClient, esClient } = createClientMock();
    const idsToUnenroll = [agentInRegularDoc._id, agentInHostedDoc._id, agentInRegularDoc2._id];
    await unenrollAgents(soClient, esClient, { agentIds: idsToUnenroll, force: true });

    // calls ES update with correct values
    const calledWith = esClient.bulk.mock.calls[1][0];
    const ids = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.doc)
      .map((i: any) => i.doc);
    expect(ids).toEqual(idsToUnenroll);
    for (const doc of docs!) {
      expect(doc).toHaveProperty('unenrollment_started_at');
    }
  });

  it('can unenroll from hosted agent policy with force=true and revoke=true', async () => {
    const { soClient, esClient } = createClientMock();

    const idsToUnenroll = [agentInRegularDoc._id, agentInHostedDoc._id, agentInRegularDoc2._id];

    const unenrolledResponse = await unenrollAgents(soClient, esClient, {
      agentIds: idsToUnenroll,
      revoke: true,
      force: true,
    });

    expect(unenrolledResponse.items).toMatchObject([
      {
        id: 'agent-in-regular-policy',
        success: true,
      },
      {
        id: 'agent-in-hosted-policy',
        success: true,
      },
      {
        id: 'agent-in-regular-policy2',
        success: true,
      },
    ]);

    // calls ES update with correct values
    const calledWith = esClient.bulk.mock.calls[0][0];
    const ids = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.update !== undefined)
      .map((i: any) => i.update._id);
    const docs = (calledWith as estypes.BulkRequest)?.body
      ?.filter((i: any) => i.doc)
      .map((i: any) => i.doc);
    expect(ids).toEqual(idsToUnenroll);
    for (const doc of docs!) {
      expect(doc).toHaveProperty('unenrolled_at');
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
      case regularAgentPolicySO.id:
        return regularAgentPolicySO;
      case hostedAgentPolicySO.id:
        return hostedAgentPolicySO;
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
  esClientMock.get.mockResponseImplementation(({ id }) => {
    switch (id) {
      case agentInHostedDoc._id:
        return { body: agentInHostedDoc };
      case agentInRegularDoc2._id:
        return { body: agentInRegularDoc2 };
      case agentInRegularDoc._id:
        return { body: agentInRegularDoc };
      default:
        throw new Error('not found');
    }
  });
  esClientMock.bulk.mockResponse(
    // @ts-expect-error not full interface
    { items: [] }
  );

  esClientMock.mget.mockResponseImplementation((params) => {
    // @ts-expect-error
    const docs = params?.body.docs.map(({ _id }) => {
      switch (_id) {
        case agentInHostedDoc._id:
          return agentInHostedDoc;
        case agentInRegularDoc2._id:
          return agentInRegularDoc2;
        case agentInRegularDoc._id:
          return agentInRegularDoc;
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
