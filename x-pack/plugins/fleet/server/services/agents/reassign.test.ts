/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsRepositoryMock } from 'src/core/server/mocks';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SavedObject } from 'kibana/server';

import type { AgentPolicy } from '../../types';
import { HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import { reassignAgent, reassignAgents } from './reassign';

const agentInHostedDoc = {
  _id: 'agent-in-hosted-policy',
  _source: { policy_id: 'hosted-agent-policy' },
};
const agentInHostedDoc2 = {
  _id: 'agent-in-hosted-policy2',
  _source: { policy_id: 'hosted-agent-policy' },
};
const agentInRegularDoc = {
  _id: 'agent-in-regular-policy',
  _source: { policy_id: 'regular-agent-policy' },
};
const regularAgentPolicySO = {
  id: 'regular-agent-policy',
  attributes: { is_managed: false },
} as SavedObject<AgentPolicy>;
const regularAgentPolicySO2 = {
  id: 'regular-agent-policy-2',
  attributes: { is_managed: false },
} as SavedObject<AgentPolicy>;
const hostedAgentPolicySO = {
  id: 'hosted-agent-policy',
  attributes: { is_managed: true },
} as SavedObject<AgentPolicy>;

describe('reassignAgent (singular)', () => {
  it('can reassign from regular agent policy to regular', async () => {
    const { soRepo, esClient } = createClientsMock();
    await reassignAgent(soRepo, esClient, agentInRegularDoc._id, regularAgentPolicySO.id);

    // calls ES update with correct values
    expect(esClient.update).toBeCalledTimes(1);
    const calledWith = esClient.update.mock.calls[0];
    expect(calledWith[0]?.id).toBe(agentInRegularDoc._id);
    expect((calledWith[0] as estypes.UpdateRequest)?.body?.doc).toHaveProperty(
      'policy_id',
      regularAgentPolicySO.id
    );
  });

  it('cannot reassign from regular agent policy to hosted', async () => {
    const { soRepo, esClient } = createClientsMock();
    await expect(
      reassignAgent(soRepo, esClient, agentInRegularDoc._id, hostedAgentPolicySO.id)
    ).rejects.toThrowError(HostedAgentPolicyRestrictionRelatedError);

    // does not call ES update
    expect(esClient.update).toBeCalledTimes(0);
  });

  it('cannot reassign from hosted agent policy', async () => {
    const { soRepo, esClient } = createClientsMock();
    await expect(
      reassignAgent(soRepo, esClient, agentInHostedDoc._id, regularAgentPolicySO.id)
    ).rejects.toThrowError(HostedAgentPolicyRestrictionRelatedError);
    // does not call ES update
    expect(esClient.update).toBeCalledTimes(0);

    await expect(
      reassignAgent(soRepo, esClient, agentInHostedDoc._id, hostedAgentPolicySO.id)
    ).rejects.toThrowError(HostedAgentPolicyRestrictionRelatedError);
    // does not call ES update
    expect(esClient.update).toBeCalledTimes(0);
  });
});

describe('reassignAgents (plural)', () => {
  it('agents in hosted policies are not updated', async () => {
    const { soRepo, esClient } = createClientsMock();
    const idsToReassign = [agentInRegularDoc._id, agentInHostedDoc._id, agentInHostedDoc2._id];
    await reassignAgents(soRepo, esClient, { agentIds: idsToReassign }, regularAgentPolicySO2.id);

    // calls ES update with correct values
    const calledWith = esClient.bulk.mock.calls[0][0];
    // only 1 are regular and bulk write two line per update
    expect((calledWith as estypes.BulkRequest).body?.length).toBe(2);
    // @ts-expect-error
    expect(calledWith.body[0].update._id).toEqual(agentInRegularDoc._id);
  });
});

function createClientsMock() {
  const soRepoMock = savedObjectsRepositoryMock.create();

  // need to mock .create & bulkCreate due to (bulk)createAgentAction(s) in reassignAgent(s)
  // @ts-expect-error
  soRepoMock.create.mockResolvedValue({ attributes: { agent_id: 'test' } });
  soRepoMock.bulkCreate.mockImplementation(async ([{ type, attributes }]) => {
    return {
      saved_objects: [await soRepoMock.create(type, attributes)],
    };
  });
  soRepoMock.bulkUpdate.mockResolvedValue({
    saved_objects: [],
  });
  soRepoMock.get.mockImplementation(async (_, id) => {
    switch (id) {
      case regularAgentPolicySO.id:
        return regularAgentPolicySO;
      case hostedAgentPolicySO.id:
        return hostedAgentPolicySO;
      case regularAgentPolicySO2.id:
        return regularAgentPolicySO2;
      default:
        throw new Error(`${id} not found`);
    }
  });
  soRepoMock.bulkGet.mockImplementation(async (options) => {
    return {
      saved_objects: await Promise.all(options!.map(({ type, id }) => soRepoMock.get(type, id))),
    };
  });

  const esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
  // @ts-expect-error
  esClientMock.mget.mockImplementation(async () => {
    return {
      body: {
        docs: [agentInHostedDoc, agentInRegularDoc, agentInHostedDoc2],
      },
    };
  });
  // @ts-expect-error
  esClientMock.get.mockImplementation(async ({ id }) => {
    switch (id) {
      case agentInHostedDoc._id:
        return { body: agentInHostedDoc };
      case agentInRegularDoc._id:
        return { body: agentInRegularDoc };
      default:
        throw new Error(`${id} not found`);
    }
  });
  esClientMock.bulk.mockResolvedValue({
    // @ts-expect-error not full interface
    body: { items: [] },
  });

  return { soRepo: soRepoMock, esClient: esClientMock };
}
