/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { createClientMock } from './action.mock';
import { updateAgentTags } from './update_agent_tags';

jest.mock('../app_context', () => {
  return {
    appContextService: {
      getLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
      } as any),
    },
  };
});

jest.mock('../agent_policy', () => {
  return {
    agentPolicyService: {
      getByIDs: jest.fn().mockResolvedValue([{ id: 'hosted-agent-policy', is_managed: true }]),
    },
  };
});

const mockRunAsync = jest.fn().mockResolvedValue({});
jest.mock('./update_agent_tags_action_runner', () => ({
  ...jest.requireActual('./update_agent_tags_action_runner'),
  UpdateAgentTagsActionRunner: jest.fn().mockImplementation(() => {
    return { runActionAsyncWithRetry: mockRunAsync };
  }),
}));

describe('update_agent_tags', () => {
  let esClient: ElasticsearchClientMock;
  let soClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createInternalClient();
    soClient = savedObjectsClientMock.create();
    esClient.mget.mockResolvedValue({
      docs: [
        {
          _id: 'agent1',
          _source: {
            tags: ['one', 'two', 'three'],
          },
        } as any,
      ],
    });
    esClient.bulk.mockReset();
    esClient.bulk.mockResolvedValue({
      items: [],
    } as any);

    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({ failures: [], updated: 1 } as any);

    mockRunAsync.mockClear();
  });

  it('should remove duplicate tags', async () => {
    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one', 'one'], ['two']);

    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        conflicts: 'abort',
        index: '.fleet-agents',
        query: { terms: { _id: ['agent1'] } },
        script: expect.objectContaining({
          lang: 'painless',
          params: expect.objectContaining({
            tagsToAdd: ['one'],
            tagsToRemove: ['two'],
            updatedAt: expect.anything(),
          }),
          source: expect.anything(),
        }),
      })
    );
  });

  it('should update action results on success', async () => {
    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one'], []);

    const agentAction = esClient.create.mock.calls[0][0] as any;
    expect(agentAction?.body).toEqual(
      expect.objectContaining({
        action_id: expect.anything(),
        agents: ['agent1'],
        type: 'UPDATE_TAGS',
        total: 1,
      })
    );

    const actionResults = esClient.bulk.mock.calls[0][0] as any;
    const agentIds = actionResults?.body
      ?.filter((i: any) => i.agent_id)
      .map((i: any) => i.agent_id);
    expect(agentIds).toEqual(['agent1']);
    expect(actionResults.body[1].error).not.toBeDefined();
  });

  it('should write error action results for hosted agent when agentIds are passed', async () => {
    const { esClient: esClientMock, agentInHostedDoc } = createClientMock();

    await updateAgentTags(
      soClient,
      esClientMock,
      { agentIds: [agentInHostedDoc._id] },
      ['newName'],
      []
    );

    const agentAction = esClientMock.create.mock.calls[0][0] as any;
    expect(agentAction?.body).toEqual(
      expect.objectContaining({
        action_id: expect.anything(),
        agents: [],
        type: 'UPDATE_TAGS',
        total: 1,
      })
    );

    const errorResults = esClientMock.bulk.mock.calls[0][0] as any;
    const errorIds = errorResults?.body?.filter((i: any) => i.agent_id).map((i: any) => i.agent_id);
    expect(errorIds).toEqual([agentInHostedDoc._id]);
    expect(errorResults.body[1].error).toEqual(
      'Cannot modify tags on a hosted agent in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.'
    );
  });

  it('should write error action results when failures are returned', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({
      failures: [{ cause: { reason: 'error reason' } }],
      updated: 0,
    } as any);

    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one'], []);

    const errorResults = esClient.bulk.mock.calls[0][0] as any;
    expect(errorResults.body[1].error).toEqual('error reason');
  });

  it('should write error action results when less agents updated than total', async () => {
    const { esClient: esClientMock, agentInRegularDoc, agentInRegularDoc2 } = createClientMock();

    esClientMock.updateByQuery.mockReset();
    esClientMock.updateByQuery.mockResolvedValue({ failures: [], updated: 0, total: '1' } as any);

    await updateAgentTags(
      soClient,
      esClientMock,
      { agentIds: [agentInRegularDoc._id, agentInRegularDoc2._id] },
      ['one'],
      []
    );

    const errorResults = esClientMock.bulk.mock.calls[0][0] as any;
    expect(errorResults.body[1].error).toEqual('Cannot modify tags on a hosted agent');
  });

  it('should run add tags async when actioning more agents than batch size', async () => {
    esClient.search.mockResolvedValue({
      hits: {
        total: 3,
        hits: [
          {
            _id: 'agent1',
            _source: {},
          } as any,
          {
            _id: 'agent2',
            _source: {},
          } as any,
          {
            _id: 'agent3',
            _source: {},
          } as any,
        ],
      },
      took: 0,
      timed_out: false,
      _shards: {} as any,
    });

    await updateAgentTags(soClient, esClient, { kuery: '', batchSize: 2 }, ['newName'], []);

    expect(mockRunAsync).toHaveBeenCalled();
  });
});
