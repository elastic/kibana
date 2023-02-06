/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { SavedObject } from '@kbn/core-saved-objects-server';

import type { AgentPolicy } from '../../types';

export function createClientMock() {
  const agentInHostedDoc = {
    _id: 'agent-in-hosted-policy',
    _index: 'index',
    _source: {
      policy_id: 'hosted-agent-policy',
      local_metadata: { elastic: { agent: { version: '8.4.0', upgradeable: true } } },
    },
    fields: {
      status: ['online'],
    },
  };
  const agentInHostedDoc2 = {
    _id: 'agent-in-hosted-policy2',
    _index: 'index',
    _source: {
      policy_id: 'hosted-agent-policy',
      local_metadata: { elastic: { agent: { version: '8.4.0', upgradeable: true } } },
    },
    fields: {
      status: ['online'],
    },
  };
  const agentInRegularDoc = {
    _id: 'agent-in-regular-policy',
    _index: 'index',
    _source: {
      policy_id: 'regular-agent-policy',
      local_metadata: { elastic: { agent: { version: '8.4.0', upgradeable: true } } },
    },
    fields: {
      status: ['online'],
    },
  };
  const agentInRegularDoc2 = {
    _id: 'agent-in-regular-policy2',
    _index: 'index',
    _source: {
      policy_id: 'regular-agent-policy',
      local_metadata: { elastic: { agent: { version: '8.4.0', upgradeable: true } } },
    },
    fields: {
      status: ['online'],
    },
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

  const soClientMock = savedObjectsClientMock.create();

  soClientMock.get.mockImplementation(async (_, id) => {
    switch (id) {
      case regularAgentPolicySO.id:
        return regularAgentPolicySO;
      case hostedAgentPolicySO.id:
        return hostedAgentPolicySO;
      case regularAgentPolicySO2.id:
        return regularAgentPolicySO2;
      default:
        throw new Error('not found');
    }
  });

  soClientMock.bulkGet.mockImplementation(async (options) => {
    return {
      saved_objects: await Promise.all(options!.map(({ type, id }) => soClientMock.get(type, id))),
    };
  });

  soClientMock.find.mockResolvedValue({
    saved_objects: [],
    total: 0,
    per_page: 10,
    page: 1,
  });

  const esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
  // @ts-expect-error
  esClientMock.get.mockResponseImplementation(({ id }) => {
    switch (id) {
      case agentInHostedDoc._id:
        return { body: agentInHostedDoc };
      case agentInHostedDoc2._id:
        return { body: agentInHostedDoc2 };
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
      let result;
      switch (_id) {
        case agentInHostedDoc._id:
          result = agentInHostedDoc;
          break;
        case agentInHostedDoc2._id:
          result = agentInHostedDoc2;
          break;
        case agentInRegularDoc2._id:
          result = agentInRegularDoc2;
          break;
        case agentInRegularDoc._id:
          result = agentInRegularDoc;
          break;
        default:
          throw new Error('not found');
      }
      return { found: true, ...result };
    });
    return {
      body: {
        docs,
      },
    };
  });

  esClientMock.search.mockImplementation(() =>
    Promise.resolve({
      took: 1,
      timed_out: false,
      _shards: {
        failed: 0,
        successful: 1,
        total: 1,
      },
      hits: {
        hits: [agentInHostedDoc, agentInRegularDoc, agentInRegularDoc2],
        total: {
          value: 3,
          relation: 'eq',
        },
      },
    })
  );

  return {
    soClient: soClientMock,
    esClient: esClientMock,
    agentInHostedDoc,
    agentInHostedDoc2,
    agentInRegularDoc,
    agentInRegularDoc2,
    regularAgentPolicySO,
    hostedAgentPolicySO,
    regularAgentPolicySO2,
  };
}
