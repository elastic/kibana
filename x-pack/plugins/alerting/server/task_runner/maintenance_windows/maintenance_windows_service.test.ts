/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { alertingEventLoggerMock } from '../../lib/alerting_event_logger/alerting_event_logger.mock';
import { MaintenanceWindowsService } from './maintenance_windows_service';
import { maintenanceWindowClientMock } from '../../maintenance_window_client.mock';
import { getMaintenanceWindows } from './get_maintenance_windows';
import { getMockMaintenanceWindow } from '../../data/maintenance_window/test_helpers';
import { MaintenanceWindowStatus } from '../../../common';

jest.mock('./get_maintenance_windows', () => {
  const originalModule = jest.requireActual('./get_maintenance_windows');
  return {
    ...originalModule,
    getMaintenanceWindows: jest.fn(),
  };
});

const alertingEventLogger = alertingEventLoggerMock.create();
const logger = loggingSystemMock.createLogger();
const maintenanceWindowClient = maintenanceWindowClientMock.create();

const maintenanceWindows = [
  {
    ...getMockMaintenanceWindow(),
    eventStartTime: new Date().toISOString(),
    eventEndTime: new Date().toISOString(),
    status: MaintenanceWindowStatus.Running,
    id: 'test-id1',
  },
  {
    ...getMockMaintenanceWindow(),
    eventStartTime: new Date().toISOString(),
    eventEndTime: new Date().toISOString(),
    status: MaintenanceWindowStatus.Running,
    id: 'test-id2',
  },
];

const fakeRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
  getSavedObjectsClient: jest.fn(),
} as unknown as KibanaRequest;

describe('MaintenanceWindowsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load maintenance windows', async () => {
    (getMaintenanceWindows as jest.Mock).mockReturnValueOnce(maintenanceWindows);
    const maintenanceWindowsService = new MaintenanceWindowsService({
      alertingEventLogger,
      getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
      logger,
    });

    maintenanceWindowsService.initialize({
      request: fakeRequest,
      ruleId: '1',
      ruleTypeId: 'category',
      ruleTypeCategory: 'example-rule-type',
    });

    const result = await maintenanceWindowsService.loadMaintenanceWindows();
    expect(result.maintenanceWindows).toEqual(maintenanceWindows);
    expect(result.maintenanceWindowsWithoutScopedQueryIds).toEqual(['test-id1', 'test-id2']);

    expect(getMaintenanceWindows).toHaveBeenCalledTimes(1);
    expect(getMaintenanceWindows).toHaveBeenCalledWith({
      fakeRequest,
      getMaintenanceWindowClientWithRequest: expect.any(Function),
      logger,
      ruleId: '1',
      ruleTypeId: 'category',
      ruleTypeCategory: 'example-rule-type',
    });

    expect(alertingEventLogger.setMaintenanceWindowIds).toHaveBeenCalledTimes(1);
    expect(alertingEventLogger.setMaintenanceWindowIds).toHaveBeenCalledWith([
      'test-id1',
      'test-id2',
    ]);
  });

  test('should not call alertingEventLogger.setMaintenanceWindowIds if all maintenance windows have scoped queries', async () => {
    const mwWithScopedQuery = maintenanceWindows.map((mw) => ({ ...mw, scopedQuery: 'test' }));
    (getMaintenanceWindows as jest.Mock).mockReturnValueOnce(mwWithScopedQuery);
    const maintenanceWindowsService = new MaintenanceWindowsService({
      alertingEventLogger,
      getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
      logger,
    });

    maintenanceWindowsService.initialize({
      request: fakeRequest,
      ruleId: '1',
      ruleTypeId: 'category',
      ruleTypeCategory: 'example-rule-type',
    });

    const result = await maintenanceWindowsService.loadMaintenanceWindows();
    expect(result.maintenanceWindows).toEqual(mwWithScopedQuery);
    expect(result.maintenanceWindowsWithoutScopedQueryIds).toEqual([]);

    expect(getMaintenanceWindows).toHaveBeenCalledTimes(1);
    expect(getMaintenanceWindows).toHaveBeenCalledWith({
      fakeRequest,
      getMaintenanceWindowClientWithRequest: expect.any(Function),
      logger,
      ruleId: '1',
      ruleTypeId: 'category',
      ruleTypeCategory: 'example-rule-type',
    });

    expect(alertingEventLogger.setMaintenanceWindowIds).not.toHaveBeenCalled();
  });

  test('should not load maintenance windows if not initialized', async () => {
    const maintenanceWindowsService = new MaintenanceWindowsService({
      alertingEventLogger,
      getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
      logger,
    });

    const result = await maintenanceWindowsService.loadMaintenanceWindows();
    expect(result.maintenanceWindows).toEqual([]);
    expect(result.maintenanceWindowsWithoutScopedQueryIds).toEqual([]);

    expect(logger.warn).toHaveBeenCalledWith(
      `Not loading maintenance windows because the service is not initialized.`
    );
    expect(getMaintenanceWindows).not.toHaveBeenCalled();
    expect(alertingEventLogger.setMaintenanceWindowIds).not.toHaveBeenCalled();
  });

  test('should not load maintenance windows if already loaded', async () => {
    (getMaintenanceWindows as jest.Mock).mockReturnValueOnce(maintenanceWindows);
    const maintenanceWindowsService = new MaintenanceWindowsService({
      alertingEventLogger,
      getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
      logger,
    });

    maintenanceWindowsService.initialize({
      request: fakeRequest,
      ruleId: '1',
      ruleTypeId: 'category',
      ruleTypeCategory: 'example-rule-type',
    });

    const result1 = await maintenanceWindowsService.loadMaintenanceWindows();
    const result2 = await maintenanceWindowsService.loadMaintenanceWindows();

    expect(result1.maintenanceWindows).toEqual(maintenanceWindows);
    expect(result1.maintenanceWindowsWithoutScopedQueryIds).toEqual(['test-id1', 'test-id2']);
    expect(result1).toEqual(result2);

    expect(getMaintenanceWindows).toHaveBeenCalledTimes(1);
    expect(alertingEventLogger.setMaintenanceWindowIds).toHaveBeenCalledTimes(1);
  });
});
