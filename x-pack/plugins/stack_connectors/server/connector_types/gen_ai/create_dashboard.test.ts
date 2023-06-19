/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initGenAiDashboard } from './create_dashboard';
import { getGenAiDashboard } from './dashboard';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { Logger } from '@kbn/logging';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('12345'),
}));

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

const savedObjectsClient = savedObjectsClientMock.create();
describe('createDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('fetches the Gen Ai Dashboard saved object', async () => {
    const dashboardId = 'test-dashboard-id';
    const result = await initGenAiDashboard({ logger, savedObjectsClient, dashboardId });
    expect(result.success).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
    expect(savedObjectsClient.get).toHaveBeenCalledWith('dashboard', dashboardId);
  });

  it('creates the Gen Ai Dashboard saved object when the dashboard saved object does not exist', async () => {
    const dashboardId = 'test-dashboard-id';
    const soClient = {
      ...savedObjectsClient,
      get: jest.fn().mockRejectedValue({
        output: {
          statusCode: 404,
          payload: {
            statusCode: 404,
            error: 'Not Found',
            message: 'Saved object [dashboard/generative-ai-token-usage-default] not found',
          },
          headers: {},
        },
      }),
    };
    const result = await initGenAiDashboard({ logger, savedObjectsClient: soClient, dashboardId });

    expect(soClient.get).toHaveBeenCalledWith('dashboard', dashboardId);
    expect(soClient.create).toHaveBeenCalledWith(
      'dashboard',
      getGenAiDashboard(dashboardId).attributes,
      { overwrite: true, id: dashboardId }
    );
    expect(result.success).toBe(true);
  });

  it('handles an error when fetching the dashboard saved object', async () => {
    const soClient = {
      ...savedObjectsClient,
      get: jest.fn().mockRejectedValue({
        output: {
          statusCode: 500,
          payload: {
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Error happened',
          },
          headers: {},
        },
      }),
    };
    const dashboardId = 'test-dashboard-id';
    const result = await initGenAiDashboard({ logger, savedObjectsClient: soClient, dashboardId });
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Internal Server Error: Error happened');
    expect(result.error?.statusCode).toBe(500);
    expect(soClient.get).toHaveBeenCalledWith('dashboard', dashboardId);
  });
});
