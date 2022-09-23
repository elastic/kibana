/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { updateAgentTags } from './update_agent_tags';

jest.mock('./filter_hosted_agents', () => ({
  filterHostedPolicies: jest
    .fn()
    .mockImplementation((soClient, givenAgents) => Promise.resolve(givenAgents)),
}));

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
    esClient.bulk.mockResolvedValue({
      items: [],
    } as any);

    mockRunAsync.mockClear();
  });

  function expectTagsInEsBulk(tags: string[]) {
    expect(esClient.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        body: [
          expect.anything(),
          {
            doc: expect.objectContaining({
              tags,
            }),
          },
        ],
      })
    );
  }

  it('should replace tag in middle place when one add and one remove tag', async () => {
    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['newName'], ['two']);

    expectTagsInEsBulk(['one', 'newName', 'three']);
  });

  it('should replace tag in first place when one add and one remove tag', async () => {
    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['newName'], ['one']);

    expectTagsInEsBulk(['newName', 'two', 'three']);
  });

  it('should replace tag in last place when one add and one remove tag', async () => {
    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['newName'], ['three']);

    expectTagsInEsBulk(['one', 'two', 'newName']);
  });

  it('should add tag when tagsToRemove does not exist', async () => {
    esClient.mget.mockResolvedValue({
      docs: [
        {
          _id: 'agent1',
          _source: {},
        } as any,
      ],
    });
    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['newName'], ['three']);

    expectTagsInEsBulk(['newName']);
  });

  it('should remove duplicate tags', async () => {
    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one'], ['two']);

    expectTagsInEsBulk(['one', 'three']);
  });

  it('should add tag at the end when no tagsToRemove', async () => {
    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['newName'], []);

    expectTagsInEsBulk(['one', 'two', 'three', 'newName']);
  });

  it('should add tag at the end when tagsToRemove not in existing tags', async () => {
    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['newName'], ['dummy']);

    expectTagsInEsBulk(['one', 'two', 'three', 'newName']);
  });

  it('should add tag at the end when multiple tagsToRemove', async () => {
    await updateAgentTags(
      soClient,
      esClient,
      { agentIds: ['agent1'] },
      ['newName'],
      ['one', 'two']
    );

    expectTagsInEsBulk(['three', 'newName']);
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
