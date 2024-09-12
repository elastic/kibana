/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { RISK_ENGINE_CLEANUP_URL } from '../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { riskEnginePrivilegesMock } from './risk_engine_privileges.mock';
import { riskEngineDataClientMock } from '../risk_engine_data_client.mock';
import { riskEngineCleanupRoute } from './delete';

describe('risk engine cleanup route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: ReturnType<typeof requestContextMock.convertContext>;
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let mockRiskEngineDataClient: ReturnType<typeof riskEngineDataClientMock.create>;
  let getStartServicesMock: jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();

    server = serverMock.create();
    const { clients } = requestContextMock.createTools();
    mockRiskEngineDataClient = riskEngineDataClientMock.create();
    context = requestContextMock.convertContext(
      requestContextMock.create({
        ...clients,
        riskEngineDataClient: mockRiskEngineDataClient,
      })
    );
    mockTaskManagerStart = taskManagerMock.createStart();
  });

  const buildRequest = () => {
    return requestMock.create({
      method: 'delete',
      path: RISK_ENGINE_CLEANUP_URL,
      body: {},
    });
  };
  describe('invokes the risk engine cleanup route', () => {
    beforeEach(() => {
      getStartServicesMock = jest.fn().mockResolvedValue([
        {},
        {
          taskManager: mockTaskManagerStart,
          security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
        },
      ]);
      riskEngineCleanupRoute(server.router, getStartServicesMock);
    });

    it('should call the router with the correct route and handler', async () => {
      const request = buildRequest();
      await server.inject(request, context);
      expect(mockRiskEngineDataClient.tearDown).toHaveBeenCalled();
    });

    it('returns a 200 when cleanup is successful', async () => {
      const request = buildRequest();
      const response = await server.inject(request, context);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ risk_engine_cleanup: true });
    });

    it('returns a 400 when cleanup endpoint is called multiple times', async () => {
      mockRiskEngineDataClient.tearDown.mockImplementation(async () => {
        return [Error('Risk engine is disabled or deleted already.')];
      });
      const request = buildRequest();
      const response = await server.inject(request, context);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        risk_engine_cleanup: false,
        errors: [
          {
            seq: 1,
            error: 'Error: Risk engine is disabled or deleted already.',
          },
        ],
        status_code: 400,
      });
    });

    it('returns a 500 when cleanup is unsuccessful', async () => {
      mockRiskEngineDataClient.tearDown.mockImplementation(() => {
        throw new Error('Error tearing down');
      });
      const request = buildRequest();
      const response = await server.inject(request, context);
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        errors: {
          error: '{}',
          seq: 1,
        },
        risk_engine_cleanup: false,
        status_code: 500,
      });
    });

    it('returns a 500 when cleanup is unsuccessful with multiple errors', async () => {
      mockRiskEngineDataClient.tearDown.mockImplementation(async () => {
        return [
          Error('Error while removing risk scoring task'),
          Error('Error while deleting saved objects'),
          Error('Error while removing risk score index'),
        ];
      });
      const request = buildRequest();
      const response = await server.inject(request, context);
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        errors: [
          {
            seq: 1,
            error: 'Error: Error while removing risk scoring task',
          },
          {
            seq: 2,
            error: 'Error: Error while deleting saved objects',
          },
          {
            seq: 3,
            error: 'Error: Error while removing risk score index',
          },
        ],
        risk_engine_cleanup: false,
        status_code: 500,
      });
    });
  });
  describe('when task manager is unavailable', () => {
    beforeEach(() => {
      getStartServicesMock = jest.fn().mockResolvedValue([
        {},
        {
          security: riskEnginePrivilegesMock.createMockSecurityStartWithFullRiskEngineAccess(),
        },
      ]);
      riskEngineCleanupRoute(server.router, getStartServicesMock);
    });

    it('returns a 400 when task manager is unavailable', async () => {
      const request = buildRequest();
      const response = await server.inject(request, context);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message:
          'Task Manager is unavailable, but is required by the risk engine. Please enable the taskManager plugin and try again.',
        status_code: 400,
      });
    });
  });

  describe('when user does not have the required privileges', () => {
    beforeEach(() => {
      getStartServicesMock = jest.fn().mockResolvedValue([
        {},
        {
          taskManager: mockTaskManagerStart,
          security: riskEnginePrivilegesMock.createMockSecurityStartWithNoRiskEngineAccess(),
        },
      ]);
      riskEngineCleanupRoute(server.router, getStartServicesMock);
    });

    it('returns a 403 when user does not have the required privileges', async () => {
      const request = buildRequest();
      const response = await server.inject(request, context);
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        message:
          'User is missing risk engine privileges.  Missing cluster privileges: manage_index_templates, manage_transform.',
        status_code: 403,
      });
    });
  });
});
