/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { alertingEventLoggerMock } from '../../lib/alerting_event_logger/alerting_event_logger.mock';
import { MaintenanceWindowsService } from './maintenance_windows_service';
import { maintenanceWindowClientMock } from '../../maintenance_window_client.mock';
import { getMockMaintenanceWindow } from '../../data/maintenance_window/test_helpers';
import { MaintenanceWindowStatus } from '../../../common';
import { MaintenanceWindowCategoryIds } from '../../../common/routes/maintenance_window/shared';
import { FilterStateStore } from '@kbn/es-query';

const alertingEventLogger = alertingEventLoggerMock.create();
const logger = loggingSystemMock.createLogger();
const maintenanceWindowClient = maintenanceWindowClientMock.create();
let fakeTimer: sinon.SinonFakeTimers;

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
  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers(new Date('2023-02-27T08:15:00.000Z'));
  });

  beforeEach(() => {
    fakeTimer.reset();
    jest.clearAllMocks();
  });

  afterAll(() => fakeTimer.restore());

  test('should load maintenance windows if none in cache', async () => {
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce(maintenanceWindows);
    const maintenanceWindowsService = new MaintenanceWindowsService({
      getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
      logger,
    });
    // @ts-ignore - accessing private variable
    expect(maintenanceWindowsService.windows.get('default')).toBeUndefined();

    const windows = await maintenanceWindowsService.loadMaintenanceWindows({
      request: fakeRequest,
      spaceId: 'default',
      eventLogger: alertingEventLogger,
      ruleTypeCategory: 'rule-category',
    });
    expect(maintenanceWindowClient.getActiveMaintenanceWindows).toHaveBeenCalledTimes(1);

    // @ts-ignore - accessing private variable
    expect(maintenanceWindowsService.windows.get('default')).toEqual({
      lastUpdated: 1677485700000,
      activeMaintenanceWindows: maintenanceWindows,
    });

    expect(windows.maintenanceWindows).toEqual(maintenanceWindows);
    expect(windows.maintenanceWindowsWithoutScopedQueryIds).toEqual(['test-id1', 'test-id2']);

    expect(alertingEventLogger.setMaintenanceWindowIds).toHaveBeenCalledWith([
      'test-id1',
      'test-id2',
    ]);
  });

  test('should return empty arrays if fetch settings errors and nothing in cache', async () => {
    maintenanceWindowClient.getActiveMaintenanceWindows.mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    const maintenanceWindowsService = new MaintenanceWindowsService({
      getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
      logger,
    });
    // @ts-ignore - accessing private variable
    expect(maintenanceWindowsService.windows.get('default')).toBeUndefined();

    const windows = await maintenanceWindowsService.loadMaintenanceWindows({
      request: fakeRequest,
      spaceId: 'default',
      eventLogger: alertingEventLogger,
      ruleTypeCategory: 'rule-category',
    });
    expect(maintenanceWindowClient.getActiveMaintenanceWindows).toHaveBeenCalledTimes(1);

    // @ts-ignore - accessing private variable
    expect(maintenanceWindowsService.windows.get('default')).toBeUndefined();

    expect(windows.maintenanceWindows).toEqual([]);
    expect(windows.maintenanceWindowsWithoutScopedQueryIds).toEqual([]);

    expect(alertingEventLogger.setMaintenanceWindowIds).not.toHaveBeenCalled();
  });

  test('should fetch maintenance windows per space', async () => {
    const newSpaceMW = [
      {
        ...getMockMaintenanceWindow(),
        eventStartTime: new Date().toISOString(),
        eventEndTime: new Date().toISOString(),
        status: MaintenanceWindowStatus.Running,
        id: 'test-new-space-id2',
      },
    ];
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce(maintenanceWindows);
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce(newSpaceMW);
    const maintenanceWindowsService = new MaintenanceWindowsService({
      getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
      logger,
    });
    // @ts-ignore - accessing private variable
    expect(maintenanceWindowsService.windows.get('default')).toBeUndefined();
    // @ts-ignore - accessing private variable
    expect(maintenanceWindowsService.windows.get('new-space')).toBeUndefined();

    const windowsDefault = await maintenanceWindowsService.loadMaintenanceWindows({
      request: fakeRequest,
      spaceId: 'default',
      eventLogger: alertingEventLogger,
      ruleTypeCategory: 'rule-category',
    });
    const windowsNewSpace = await maintenanceWindowsService.loadMaintenanceWindows({
      request: fakeRequest,
      spaceId: 'new-space',
      eventLogger: alertingEventLogger,
      ruleTypeCategory: 'rule-category',
    });
    expect(maintenanceWindowClient.getActiveMaintenanceWindows).toHaveBeenCalledTimes(2);

    // @ts-ignore - accessing private variable
    expect(maintenanceWindowsService.windows.get('default')).toEqual({
      lastUpdated: 1677485700000,
      activeMaintenanceWindows: maintenanceWindows,
    });
    // @ts-ignore - accessing private variable
    expect(maintenanceWindowsService.windows.get('new-space')).toEqual({
      lastUpdated: 1677485700000,
      activeMaintenanceWindows: newSpaceMW,
    });

    expect(windowsDefault.maintenanceWindows).toEqual(maintenanceWindows);
    expect(windowsDefault.maintenanceWindowsWithoutScopedQueryIds).toEqual([
      'test-id1',
      'test-id2',
    ]);

    expect(windowsNewSpace.maintenanceWindows).toEqual(newSpaceMW);
    expect(windowsNewSpace.maintenanceWindowsWithoutScopedQueryIds).toEqual(['test-new-space-id2']);

    expect(alertingEventLogger.setMaintenanceWindowIds).toHaveBeenCalledWith([
      'test-id1',
      'test-id2',
    ]);
  });

  test('should use cached windows if cache has not expired', async () => {
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce(maintenanceWindows);
    const maintenanceWindowsService = new MaintenanceWindowsService({
      getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
      logger,
    });

    const windows1 = await maintenanceWindowsService.loadMaintenanceWindows({
      request: fakeRequest,
      spaceId: 'default',
      eventLogger: alertingEventLogger,
      ruleTypeCategory: 'rule-category',
    });
    fakeTimer.tick(30000);
    const windows2 = await maintenanceWindowsService.loadMaintenanceWindows({
      request: fakeRequest,
      spaceId: 'default',
      eventLogger: alertingEventLogger,
      ruleTypeCategory: 'rule-category',
    });

    expect(maintenanceWindowClient.getActiveMaintenanceWindows).toHaveBeenCalledTimes(1);

    expect(windows1.maintenanceWindows).toEqual(maintenanceWindows);
    expect(windows1.maintenanceWindowsWithoutScopedQueryIds).toEqual(['test-id1', 'test-id2']);
    expect(windows1).toEqual(windows2);

    expect(alertingEventLogger.setMaintenanceWindowIds).toHaveBeenCalledWith([
      'test-id1',
      'test-id2',
    ]);
  });

  test('should refetch windows if cache has expired', async () => {
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce(maintenanceWindows);
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce([
      maintenanceWindows[0],
    ]);
    const maintenanceWindowsService = new MaintenanceWindowsService({
      getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
      logger,
    });

    const windows1 = await maintenanceWindowsService.loadMaintenanceWindows({
      request: fakeRequest,
      spaceId: 'default',
      eventLogger: alertingEventLogger,
      ruleTypeCategory: 'rule-category',
    });
    fakeTimer.tick(61000);
    const windows2 = await maintenanceWindowsService.loadMaintenanceWindows({
      request: fakeRequest,
      spaceId: 'default',
      eventLogger: alertingEventLogger,
      ruleTypeCategory: 'rule-category',
    });

    expect(maintenanceWindowClient.getActiveMaintenanceWindows).toHaveBeenCalledTimes(2);

    expect(windows1.maintenanceWindows).toEqual(maintenanceWindows);
    expect(windows1.maintenanceWindowsWithoutScopedQueryIds).toEqual(['test-id1', 'test-id2']);
    expect(windows2.maintenanceWindows).toEqual([maintenanceWindows[0]]);
    expect(windows2.maintenanceWindowsWithoutScopedQueryIds).toEqual(['test-id1']);

    expect(alertingEventLogger.setMaintenanceWindowIds).toHaveBeenCalledWith([
      'test-id1',
      'test-id2',
    ]);
  });

  test('should return cached windows if refetching throws an error', async () => {
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce(maintenanceWindows);
    maintenanceWindowClient.getActiveMaintenanceWindows.mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    const maintenanceWindowsService = new MaintenanceWindowsService({
      getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
      logger,
    });

    const windows1 = await maintenanceWindowsService.loadMaintenanceWindows({
      request: fakeRequest,
      spaceId: 'default',
      eventLogger: alertingEventLogger,
      ruleTypeCategory: 'rule-category',
    });
    fakeTimer.tick(61000);
    const windows2 = await maintenanceWindowsService.loadMaintenanceWindows({
      request: fakeRequest,
      spaceId: 'default',
      eventLogger: alertingEventLogger,
      ruleTypeCategory: 'rule-category',
    });

    expect(maintenanceWindowClient.getActiveMaintenanceWindows).toHaveBeenCalledTimes(2);

    expect(windows1.maintenanceWindows).toEqual(maintenanceWindows);
    expect(windows1.maintenanceWindowsWithoutScopedQueryIds).toEqual(['test-id1', 'test-id2']);
    expect(windows1).toEqual(windows2);

    expect(alertingEventLogger.setMaintenanceWindowIds).toHaveBeenCalledWith([
      'test-id1',
      'test-id2',
    ]);
  });

  test('should filter by rule category', async () => {
    const mw = [
      {
        ...maintenanceWindows[0],
        categoryIds: ['observability', 'management'] as MaintenanceWindowCategoryIds,
      },
      maintenanceWindows[1],
    ];
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce(mw);
    const maintenanceWindowsService = new MaintenanceWindowsService({
      getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
      logger,
    });

    const windows = await maintenanceWindowsService.loadMaintenanceWindows({
      request: fakeRequest,
      spaceId: 'default',
      eventLogger: alertingEventLogger,
      ruleTypeCategory: 'securitySolution',
    });
    expect(maintenanceWindowClient.getActiveMaintenanceWindows).toHaveBeenCalledTimes(1);

    expect(windows.maintenanceWindows).toEqual([maintenanceWindows[1]]);
    expect(windows.maintenanceWindowsWithoutScopedQueryIds).toEqual(['test-id2']);

    expect(alertingEventLogger.setMaintenanceWindowIds).toHaveBeenCalledWith(['test-id2']);
  });

  test('should not call alertingEventLogger.setMaintenanceWindowIds if all maintenance windows have scoped queries', async () => {
    const mw = maintenanceWindows.map((window) => ({
      ...window,
      scopedQuery: {
        kql: "_id: '1234'",
        filters: [
          {
            meta: {
              disabled: false,
              negate: false,
              alias: null,
              key: 'kibana.alert.action_group',
              field: 'kibana.alert.action_group',
              params: {
                query: 'test',
              },
              type: 'phrase',
            },
            $state: {
              store: FilterStateStore.APP_STATE,
            },
            query: {
              match_phrase: {
                'kibana.alert.action_group': 'test',
              },
            },
          },
        ],
      },
    }));
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce(mw);
    const maintenanceWindowsService = new MaintenanceWindowsService({
      getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
      logger,
    });

    const windows = await maintenanceWindowsService.loadMaintenanceWindows({
      request: fakeRequest,
      spaceId: 'default',
      eventLogger: alertingEventLogger,
      ruleTypeCategory: 'securitySolution',
    });
    expect(maintenanceWindowClient.getActiveMaintenanceWindows).toHaveBeenCalledTimes(1);

    expect(windows.maintenanceWindows).toEqual(mw);
    expect(windows.maintenanceWindowsWithoutScopedQueryIds).toEqual([]);

    expect(alertingEventLogger.setMaintenanceWindowIds).not.toHaveBeenCalled();
  });

  test('should filter active maintenance windows on current time', async () => {
    const mw = [
      {
        ...getMockMaintenanceWindow(),
        events: [
          {
            gte: '2023-02-27T00:00:00.000Z',
            lte: '2023-02-28T00:00:00.000Z',
          },
          {
            gte: '2023-03-01T00:00:00.000Z',
            lte: '2023-03-02T00:00:00.000Z',
          },
        ],
        eventStartTime: new Date().toISOString(),
        eventEndTime: new Date().toISOString(),
        status: MaintenanceWindowStatus.Running,
        id: 'test-id1',
      },
      {
        ...getMockMaintenanceWindow(),
        events: [
          {
            // maintenance window starts one minute in the future
            gte: '2023-02-27T08:16:00.000Z',
            lte: '2023-02-28T00:00:00.000Z',
          },
        ],
        eventStartTime: new Date().toISOString(),
        eventEndTime: new Date().toISOString(),
        status: MaintenanceWindowStatus.Running,
        id: 'test-id2',
      },
    ];
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce(mw);
    const maintenanceWindowsService = new MaintenanceWindowsService({
      getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
      logger,
    });

    const windows = await maintenanceWindowsService.loadMaintenanceWindows({
      request: fakeRequest,
      spaceId: 'default',
      eventLogger: alertingEventLogger,
      ruleTypeCategory: 'securitySolution',
    });
    expect(maintenanceWindowClient.getActiveMaintenanceWindows).toHaveBeenCalledTimes(1);

    expect(windows.maintenanceWindows).toEqual([mw[0]]);
    expect(windows.maintenanceWindowsWithoutScopedQueryIds).toEqual(['test-id1']);
  });
});
