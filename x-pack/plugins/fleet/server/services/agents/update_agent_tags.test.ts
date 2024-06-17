/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { Agent } from '../../types';

import { createClientMock } from './action.mock';
import { MAX_RETRY_COUNT } from './retry_helper';
import { updateAgentTags } from './update_agent_tags';
import { UpdateAgentTagsActionRunner, updateTagsBatch } from './update_agent_tags_action_runner';

jest.mock('../app_context', () => {
  const { loggerMock } = jest.requireActual('@kbn/logging-mocks');
  return {
    appContextService: {
      getLogger: () => loggerMock.create(),
      getConfig: () => {},
      getMessageSigningService: jest.fn(),
      getExperimentalFeatures: jest.fn().mockResolvedValue({}),
    },
  };
});
jest.mock('../audit_logging');

jest.mock('../agent_policy', () => {
  return {
    agentPolicyService: {
      getInactivityTimeouts: jest.fn().mockResolvedValue([]),
      getByIDs: jest.fn().mockResolvedValue([{ id: 'hosted-agent-policy', is_managed: true }]),
      list: jest.fn().mockResolvedValue({ items: [] }),
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
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'agent1',
            _source: {
              tags: ['one', 'two', 'three'],
            },
            fields: {
              status: 'online',
            },
          },
        ],
      },
    } as any);
    esClient.bulk.mockReset();
    esClient.bulk.mockResolvedValue({
      items: [],
    } as any);

    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({ failures: [], updated: 1 } as any);

    mockRunAsync.mockClear();
    (UpdateAgentTagsActionRunner as jest.Mock).mockClear();
  });

  it('should remove duplicate tags', async () => {
    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one', 'one'], ['two']);

    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        conflicts: 'proceed',
        index: '.fleet-agents',
        query: {
          terms: { _id: ['agent1'] },
        },
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
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({ failures: [], updated: 1, total: 1 } as any);

    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one'], []);

    const agentAction = esClient.create.mock.calls[0][0] as any;
    expect(agentAction?.body).toEqual(
      expect.objectContaining({
        action_id: expect.anything(),
        agents: [expect.any(String)],
        type: 'UPDATE_TAGS',
        total: 1,
      })
    );

    const actionResults = esClient.bulk.mock.calls[0][0] as any;
    const agentIds = actionResults?.body
      ?.filter((i: any) => i.agent_id)
      .map((i: any) => i.agent_id);
    expect(agentIds.length).toEqual(1);
    expect(actionResults.body[1].error).not.toBeDefined();
  });

  it('should skip hosted agent from total when agentIds are passed', async () => {
    const { esClient: esClientMock, agentInHostedDoc, agentInRegularDoc } = createClientMock();

    esClientMock.updateByQuery.mockReset();
    esClientMock.updateByQuery.mockResolvedValue({ failures: [], updated: 1, total: 1 } as any);

    await updateAgentTags(
      soClient,
      esClientMock,
      { agentIds: [agentInHostedDoc._id, agentInRegularDoc._id] },
      ['newName'],
      []
    );

    const agentAction = esClientMock.create.mock.calls[0][0] as any;
    expect(agentAction?.body).toEqual(
      expect.objectContaining({
        action_id: expect.anything(),
        agents: [expect.any(String)],
        type: 'UPDATE_TAGS',
        total: 1,
      })
    );
  });

  it('should write error action results when failures are returned', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({
      failures: [{ id: 'failure1', cause: { reason: 'error reason' } }],
      updated: 0,
      total: 1,
    } as any);

    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one'], []);

    const agentAction = esClient.create.mock.calls[0][0] as any;
    expect(agentAction?.body).toEqual(
      expect.objectContaining({
        action_id: expect.anything(),
        agents: ['failure1'],
        type: 'UPDATE_TAGS',
        total: 1,
      })
    );

    const errorResults = esClient.bulk.mock.calls[0][0] as any;
    expect(errorResults.body[1].error).toEqual('error reason');
  });

  it('should throw error on version conflicts', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({
      failures: [],
      updated: 0,
      version_conflicts: 100,
    } as any);

    await expect(
      updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one'], [])
    ).rejects.toThrowError('Version conflict of 100 agents');
  });

  it('should write out error results on last retry with version conflicts', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({
      failures: [],
      updated: 0,
      version_conflicts: 100,
      total: 100,
    } as any);

    await expect(
      updateTagsBatch(
        soClient,
        esClient,
        [{ id: 'agent1' } as Agent],
        {},
        {
          tagsToAdd: ['new'],
          tagsToRemove: [],
          kuery: '',
          total: 100,
          retryCount: MAX_RETRY_COUNT,
        }
      )
    ).rejects.toThrowError('Version conflict of 100 agents');

    const agentAction = esClient.create.mock.calls[0][0] as any;
    expect(agentAction?.body.agents.length).toEqual(100);

    const errorResults = esClient.bulk.mock.calls[0][0] as any;
    expect(errorResults.body[1].error).toEqual('version conflict on last retry');
  });

  it('should combine action agents from updated, failures and version conflicts on last retry', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({
      failures: [{ id: 'failure1', cause: { reason: 'error reason' } }],
      updated: 1,
      version_conflicts: 1,
      total: 3,
    } as any);

    await expect(
      updateTagsBatch(
        soClient,
        esClient,
        [{ id: 'agent1' } as Agent],
        {},
        {
          tagsToAdd: ['new'],
          tagsToRemove: [],
          kuery: '',
          total: 3,
          retryCount: MAX_RETRY_COUNT,
        }
      )
    ).rejects.toThrowError('Version conflict of 1 agents');

    const agentAction = esClient.create.mock.calls[0][0] as any;
    expect(agentAction?.body.agents.length).toEqual(3);
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
    expect(UpdateAgentTagsActionRunner).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        batchSize: 2,
        kuery: '(NOT (tags:newName))',
        tagsToAdd: ['newName'],
        tagsToRemove: [],
      }),
      expect.anything()
    );
  });

  it('should add tags filter if only one tag to add', async () => {
    await updateTagsBatch(
      soClient,
      esClient,
      [{ id: 'agent1' } as Agent, { id: 'agent2' } as Agent],
      {},
      {
        tagsToAdd: ['new'],
        tagsToRemove: [],
        kuery: '',
      }
    );

    const updateByQuery = esClient.updateByQuery.mock.calls[0][0] as any;
    expect(updateByQuery.query).toEqual({
      terms: { _id: ['agent1', 'agent2'] },
    });
  });

  it('should add tags filter if only one tag to remove', async () => {
    await updateAgentTags(soClient, esClient, { kuery: '' }, [], ['remove']);

    expect(UpdateAgentTagsActionRunner).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        batchSize: 10000,
        kuery: '(tags:remove)',
        tagsToAdd: [],
        tagsToRemove: ['remove'],
      }),
      expect.anything()
    );
  });

  it('should add tags filter to existing kuery if only one tag to remove', async () => {
    await updateAgentTags(
      soClient,
      esClient,
      { kuery: 'status:healthy OR status:offline' },
      [],
      ['remove']
    );

    expect(UpdateAgentTagsActionRunner).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        batchSize: 10000,
        kuery: '(status:healthy OR status:offline) AND (tags:remove)',
        tagsToAdd: [],
        tagsToRemove: ['remove'],
      }),
      expect.anything()
    );
  });

  it('should write total from total param if updateByQuery returns less results', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({ failures: [], updated: 1, total: 50 } as any);

    await updateTagsBatch(
      soClient,
      esClient,
      [{ id: 'agent1' } as Agent],
      {},
      {
        tagsToAdd: ['new'],
        tagsToRemove: [],
        kuery: '',
        total: 100,
      }
    );

    const agentAction = esClient.create.mock.calls[0][0] as any;
    expect(agentAction?.body).toEqual(
      expect.objectContaining({
        action_id: expect.anything(),
        agents: [expect.any(String)],
        type: 'UPDATE_TAGS',
        total: 100,
      })
    );
  });
});
