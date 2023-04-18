/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import type { NewAgentAction } from '../../../common/types';

import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../app_context';
import { auditLoggingService } from '../audit_logging';

import {
  bulkCreateAgentActionResults,
  bulkCreateAgentActions,
  cancelAgentAction,
  createAgentAction,
  getAgentsByActionsIds,
} from './actions';
import { bulkUpdateAgents } from './crud';

jest.mock('./crud');
jest.mock('../audit_logging');

const mockedBulkUpdateAgents = bulkUpdateAgents as jest.MockedFunction<typeof bulkUpdateAgents>;
const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

describe('Agent actions', () => {
  beforeEach(async () => {
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(() => {
    appContextService.stop();
    mockedAuditLoggingService.writeCustomAuditLog.mockReset();
  });

  describe('getAgentActions', () => {
    it('should call audit logger', async () => {
      const esClientMock = elasticsearchServiceMock.createInternalClient();

      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                action_id: 'action1',
                agents: ['agent1'],
                expiration: new Date().toISOString(),
                type: 'UPGRADE',
              },
            },
          ],
        },
      } as any);

      await getAgentsByActionsIds(esClientMock, ['action1']);

      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: `User retrieved Fleet action [id=action1]`,
      });
    });
  });

  describe('createAgentAction', () => {
    it('should call audit logger', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                type: 'UPGRADE',
                action_id: 'action1',
                agents: ['agent1', 'agent2'],
                expiration: new Date().toISOString(),
              },
            },
          ],
        },
      } as any);

      await createAgentAction(esClient, {
        id: 'action1',
        type: 'UPGRADE',
        agents: ['agent1'],
      });

      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: expect.stringMatching(/User created Fleet action/),
      });
    });
  });

  describe('bulkCreateAgentAction', () => {
    it('should call audit logger', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();

      const newActions: NewAgentAction[] = [
        {
          id: 'action1',
          type: 'UPGRADE',
          agents: ['agent1'],
        },
        {
          id: 'action2',
          type: 'UPGRADE',
          agents: ['agent2'],
        },
        {
          id: 'action3',
          type: 'UPGRADE',
          agents: ['agent3'],
        },
      ];

      await bulkCreateAgentActions(esClient, newActions);

      for (const action of newActions) {
        expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
          message: `User created Fleet action [id=${action.id}]`,
        });
      }
    });
  });

  describe('bulkCreateAgentActionResults', () => {
    it('should call audit logger', async () => {
      const mockEsClient = elasticsearchServiceMock.createInternalClient();

      await bulkCreateAgentActionResults(mockEsClient, [
        {
          actionId: 'action1',
          agentId: 'agent1',
        },
      ]);

      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: `User created Fleet action result [id=action1]`,
      });
    });
  });

  describe('cancelAgentAction', () => {
    it('throw if the target action is not found', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [],
        },
      } as any);
      await expect(() => cancelAgentAction(esClient, 'i-do-not-exists')).rejects.toThrowError(
        /Action not found/
      );
    });

    it('should create one CANCEL action for each UPGRADE action found', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                action_id: 'action1',
                agents: ['agent1', 'agent2'],
                expiration: '2022-05-12T18:16:18.019Z',
                type: 'UPGRADE',
              },
            },
            {
              _source: {
                action_id: 'action1',
                agents: ['agent3', 'agent4'],
                expiration: '2022-05-12T18:16:18.019Z',
                type: 'UPGRADE',
              },
            },
          ],
        },
      } as any);
      await cancelAgentAction(esClient, 'action1');

      expect(esClient.create).toBeCalledTimes(2);
      expect(esClient.create).toBeCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            type: 'CANCEL',
            data: { target_id: 'action1' },
            agents: ['agent1', 'agent2'],
          }),
        })
      );
      expect(esClient.create).toBeCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            type: 'CANCEL',
            data: { target_id: 'action1' },
            agents: ['agent3', 'agent4'],
          }),
        })
      );
    });

    it('should cancel UPGRADE action', async () => {
      const esClient = elasticsearchServiceMock.createInternalClient();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                type: 'UPGRADE',
                action_id: 'action1',
                agents: ['agent1', 'agent2'],
                expiration: '2022-05-12T18:16:18.019Z',
              },
            },
          ],
        },
      } as any);
      await cancelAgentAction(esClient, 'action1');

      expect(mockedBulkUpdateAgents).toBeCalled();
      expect(mockedBulkUpdateAgents).toBeCalledWith(
        expect.anything(),
        [
          expect.objectContaining({ agentId: 'agent1' }),
          expect.objectContaining({ agentId: 'agent2' }),
        ],
        {}
      );
    });
  });

  describe('getAgentsByActionsIds', () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();

    it('should find agents by passing actions Ids', async () => {
      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                action_id: 'action2',
                agents: ['agent3', 'agent4'],
                expiration: '2022-05-12T18:16:18.019Z',
                type: 'UPGRADE',
              },
            },
          ],
        },
      } as any);
      const actionsIds = ['action2'];
      expect(await getAgentsByActionsIds(esClientMock, actionsIds)).toEqual(['agent3', 'agent4']);
    });

    it('should find agents by passing multiple actions Ids', async () => {
      esClientMock.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                action_id: 'action2',
                agents: ['agent3', 'agent4'],
                expiration: '2022-05-12T18:16:18.019Z',
                type: 'UPGRADE',
              },
            },
            {
              _source: {
                action_id: 'action3',
                agents: ['agent5', 'agent6', 'agent7'],
                expiration: '2022-05-12T18:16:18.019Z',
                type: 'UNENROLL',
              },
            },
          ],
        },
      } as any);
      const actionsIds = ['action2', 'actions3'];
      expect(await getAgentsByActionsIds(esClientMock, actionsIds)).toEqual([
        'agent3',
        'agent4',
        'agent5',
        'agent6',
        'agent7',
      ]);
    });
  });
});
