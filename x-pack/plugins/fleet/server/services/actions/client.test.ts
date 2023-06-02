/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { FleetActionsClientError } from '../../../common/errors';
import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../app_context';
import { auditLoggingService } from '../audit_logging';

import {
  generateFleetActionsBulkCreateESResponse,
  generateFleetActionsESResponse,
  generateFleetActionsResultsESResponse,
} from './mocks';

import { FleetActionsClient } from './client';

jest.mock('../audit_logging');
const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

describe('actions', () => {
  let fleetActionsClient: FleetActionsClient;
  let esClientMock: ReturnType<typeof elasticsearchServiceMock.createInternalClient>;

  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    esClientMock = elasticsearchServiceMock.createInternalClient();
    fleetActionsClient = new FleetActionsClient(esClientMock, 'foo');
  });

  afterEach(() => {
    appContextService.stop();
  });

  describe('createAction()', () => {
    it('should create an action', async () => {
      const action = { action_id: '1', input_type: 'foo' };
      expect(await fleetActionsClient.createAction(action)).toEqual({
        ...action,
        '@timestamp': expect.any(String),
      });
      expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
        message: `User created Fleet action [id=1]`,
      });
    });
    it('should throw error when action does not match package name', async () => {
      const action = { action_id: '1', input_type: 'bar' };
      expect(async () => await fleetActionsClient.createAction(action)).rejects.toBeInstanceOf(
        FleetActionsClientError
      );
    });
  });

  describe('bulkCreateActions()', () => {
    it('should bulk create actions', async () => {
      const actions = [
        {
          action_id: uuidV4(),
          input_type: 'foo',
        },
        {
          action_id: uuidV4(),
          input_type: 'foo',
        },
      ];
      esClientMock.bulk.mockResolvedValue(generateFleetActionsBulkCreateESResponse(actions));

      expect(await fleetActionsClient.bulkCreateActions(actions)).toEqual(
        actions.map((action) => ({
          action: { ...action, '@timestamp': expect.any(String) },
          id: action.action_id,
        }))
      );

      // expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
      //   message: `User created Fleet action [id=${expect.any(String)}]`,
      // });
    });

    it('should bulk create actions and filter out errored documents', async () => {
      const successActions = [
        {
          action_id: uuidV4(),
          input_type: 'foo',
        },
        {
          action_id: uuidV4(),
          input_type: 'foo',
        },
      ];
      esClientMock.bulk.mockResolvedValue(
        generateFleetActionsBulkCreateESResponse(
          successActions,
          [
            {
              action_id: uuidV4(),
              input_type: 'foo',
            },
          ],
          true
        )
      );

      expect(await fleetActionsClient.bulkCreateActions(successActions)).toEqual(
        successActions.map((action) => ({
          action: { ...action, '@timestamp': expect.any(String) },
          id: action.action_id,
        }))
      );

      // expect(mockedAuditLoggingService.writeCustomAuditLog).toHaveBeenCalledWith({
      //   message: `User created Fleet action [id=${expect.any(String)}]`,
      // });
    });
    it('should throw error for bulk creation on package mismatch on any given set of actions', async () => {
      const actions = [
        {
          action_id: '1',
          input_type: 'foo',
        },
        {
          action_id: '2',
          input_type: 'bar',
        },
      ];

      expect(
        async () => await fleetActionsClient.bulkCreateActions(actions)
      ).rejects.toBeInstanceOf(FleetActionsClientError);
    });
  });

  describe('getActionsByIds()', () => {
    it('should get an action by id', async () => {
      const actions = [{ action_id: '1', input_type: 'foo' }];
      esClientMock.search.mockResponse(generateFleetActionsESResponse(actions));

      expect(await fleetActionsClient.getActionsByIds(['1'])).toEqual(actions);
    });

    it('should reject when trying to get an action from a different package', async () => {
      esClientMock.search.mockResponse(
        generateFleetActionsESResponse([{ action_id: '3', input_type: 'bar' }])
      );

      expect(async () => await fleetActionsClient.getActionsByIds(['3'])).rejects.toBeInstanceOf(
        FleetActionsClientError
      );
    });
  });

  describe('getActionsWithKuery()', () => {
    it('should get actions with given kuery', async () => {
      const actions = [
        { action_id: '1', agents: ['agent-1'], input_type: 'foo' },
        { action_id: '2', agents: ['agent-2'], input_type: 'foo' },
      ];
      esClientMock.search.mockResponse(generateFleetActionsESResponse(actions));

      expect(
        await fleetActionsClient.getActionsWithKuery('action_id: "1" or action_id: "2"')
      ).toEqual({ actions, total: actions.length });
    });

    it('should reject when given kuery results do not match package name', async () => {
      const actions = [
        { action_id: '1', agents: ['agent-1'], input_type: 'foo' },
        { action_id: '2', agents: ['agent-2'], input_type: 'bar' },
      ];
      esClientMock.search.mockResponse(generateFleetActionsESResponse(actions));

      expect(
        async () => await fleetActionsClient.getActionsWithKuery('action_id: "1" or action_id: "2"')
      ).rejects.toBeInstanceOf(FleetActionsClientError);
    });
  });

  describe('getActionResultsByIds()', () => {
    it('should get action results by action ids', async () => {
      const actions = [
        { action_id: 'action-id-1', agents: ['agent-1'], input_type: 'foo' },
        { action_id: 'action-id-2', agents: ['agent-2'], input_type: 'foo' },
      ];
      esClientMock.search.mockResponse(generateFleetActionsESResponse(actions));

      const results = [
        { action_id: 'action-id-1', agent_id: 'agent-1', input_type: 'foo' },
        { action_id: 'action-id-2', agent_id: 'agent-2', input_type: 'foo' },
      ];
      esClientMock.search.mockResponse(generateFleetActionsResultsESResponse(results));

      expect(
        await fleetActionsClient.getActionResultsByIds(['action-id-1', 'action-id-2'])
      ).toEqual({ actionsResults: results, total: 2 });
    });

    it('should reject when given package name does not match result', async () => {
      const actions = [
        { action_id: 'action-id-21', agents: ['agent-1'], input_type: 'foo' },
        { action_id: 'action-id-23', agents: ['agent-2'], input_type: 'foo' },
      ];
      esClientMock.search.mockResponse(generateFleetActionsESResponse(actions));

      const results = [
        { action_id: 'action-id-21', agent_id: 'agent-1', input_type: 'foo' },
        { action_id: 'action-id-23', agent_id: 'agent-2', input_type: 'bar' },
      ];
      esClientMock.search.mockResponse(generateFleetActionsResultsESResponse(results));
      expect(
        async () => await fleetActionsClient.getActionResultsByIds(['action-id-1', 'action-id-2'])
      ).rejects.toBeInstanceOf(FleetActionsClientError);
    });
  });

  describe('getActionResultsWithKuery()', () => {
    it('should get action results with kuery', async () => {
      const actions = [
        { action_id: 'action-id-21', agents: ['agent-1'], input_type: 'foo' },
        { action_id: 'action-id-23', agents: ['agent-2'], input_type: 'foo' },
      ];
      esClientMock.search.mockResponse(generateFleetActionsESResponse(actions));

      const results = [
        { action_id: 'action-id-21', agent_id: 'agent-1', input_type: 'foo' },
        { action_id: 'action-id-23', agent_id: 'agent-2', input_type: 'foo' },
      ];
      esClientMock.search.mockResponse(generateFleetActionsResultsESResponse(results));

      expect(
        await fleetActionsClient.getActionResultsWithKuery(
          'action_id: "action-id-21" or action_id: "action-id-23"'
        )
      ).toEqual({ actionsResults: results, total: results.length });
    });

    it('should reject when given package name does not match result', async () => {
      const actions = [
        { action_id: 'action-id-21', agents: ['agent-1'], input_type: 'foo' },
        { action_id: 'action-id-23', agents: ['agent-2'], input_type: 'foo' },
      ];
      esClientMock.search.mockResponse(generateFleetActionsESResponse(actions));

      const results = [
        { action_id: 'action-id-21', agent_id: 'agent-1', input_type: 'foo' },
        { action_id: 'action-id-23', agent_id: 'agent-2', input_type: 'bar' },
      ];
      esClientMock.search.mockResponse(generateFleetActionsResultsESResponse(results));
      expect(
        async () =>
          await fleetActionsClient.getActionResultsWithKuery(
            'action_id: "action-id-21" or action_id: "action-id-23"'
          )
      ).rejects.toBeInstanceOf(FleetActionsClientError);
    });
  });
});
