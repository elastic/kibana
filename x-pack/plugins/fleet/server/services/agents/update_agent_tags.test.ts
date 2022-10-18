/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { appContextService } from '..';

import { createClientMock } from './action.mock';
import { updateAgentTags } from './update_agent_tags';

jest.mock('..');

jest.mock('./filter_hosted_agents', () => ({
  filterHostedPolicies: jest
    .fn()
    .mockImplementation((soClient, givenAgents) => Promise.resolve(givenAgents)),
}));

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getLogger.mockReturnValue({ debug: jest.fn(), warn: jest.fn() } as any);

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
    esClient.updateByQuery.mockResolvedValue({ failures: [] } as any);

    mockRunAsync.mockClear();
  });

  it('should remove duplicate tags', async () => {
    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one', 'one'], ['two']);

    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        conflicts: 'proceed',
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

  it('should write error action results for hosted agent', async () => {
    const { esClient: esClientMock, agentInHostedDoc } = createClientMock();

    await updateAgentTags(
      soClient,
      esClientMock,
      { agentIds: [agentInHostedDoc._id] },
      ['newName'],
      []
    );

    const errorResults = esClientMock.bulk.mock.calls[0][0] as any;
    const errorIds = errorResults?.body?.filter((i: any) => i.agent_id).map((i: any) => i.agent_id);
    expect(errorIds).toEqual([agentInHostedDoc._id]);
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
