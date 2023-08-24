/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateScheduleLimit } from './get_schedule_frequency';
import { RulesClient, ConstructorOptions } from '../../../../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();

const kibanaVersion = 'v8.0.0';

const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
  maxScheduledPerMinute: 100,
  minimumScheduleInterval: { value: '1m', enforce: false },
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
};

const getMockAggregationResult = (
  intervalAggs: Array<{
    interval: string;
    count: number;
  }>
) => {
  return {
    aggregations: {
      schedule_intervals: {
        buckets: intervalAggs.map(({ interval, count }) => ({
          key: interval,
          doc_count: count,
        })),
      },
    },
    page: 1,
    per_page: 20,
    total: 1,
    saved_objects: [],
  };
};

describe('getScheduleFrequency()', () => {
  beforeEach(() => {
    unsecuredSavedObjectsClient.find.mockResolvedValue(
      getMockAggregationResult([
        { interval: '1m', count: 1 },
        { interval: '1m', count: 2 },
        { interval: '1m', count: 3 },
        { interval: '5m', count: 5 },
        { interval: '5m', count: 10 },
        { interval: '5m', count: 15 },
      ])
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return the correct schedule frequency results', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    const result = await rulesClient.getScheduleFrequency();

    // (1 * 6) + (1/5 * 30) = 12
    expect(result.totalScheduledPerMinute).toEqual(12);

    // 100 - 88
    expect(result.remainingSchedulesPerMinute).toEqual(88);
  });

  test('should handle empty bucket correctly', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      page: 1,
      per_page: 20,
      total: 1,
      saved_objects: [],
    });

    const rulesClient = new RulesClient(rulesClientParams);
    const result = await rulesClient.getScheduleFrequency();

    expect(result.totalScheduledPerMinute).toEqual(0);
    expect(result.remainingSchedulesPerMinute).toEqual(100);
  });

  test('should handle malformed schedule interval correctly', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValue(
      getMockAggregationResult([
        { interval: '1m', count: 1 },
        { interval: '1m', count: 2 },
        { interval: '1m', count: 3 },
        { interval: '5m', count: 5 },
        { interval: '5m', count: 10 },
        { interval: '5m', count: 15 },
        { interval: 'invalid', count: 15 },
      ])
    );

    const rulesClient = new RulesClient(rulesClientParams);
    const result = await rulesClient.getScheduleFrequency();

    expect(result.totalScheduledPerMinute).toEqual(12);
    expect(result.remainingSchedulesPerMinute).toEqual(88);
  });
});

describe('validateScheduleLimit', () => {
  const context = {
    ...rulesClientParams,
    maxScheduledPerMinute: 5,
    minimumScheduleIntervalInMs: 1000,
    fieldsToExcludeFromPublicApi: [],
  };

  beforeEach(() => {
    unsecuredSavedObjectsClient.find.mockResolvedValue(
      getMockAggregationResult([{ interval: '1m', count: 2 }])
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should not throw if the updated interval does not exceed limits', () => {
    return expect(
      validateScheduleLimit({
        context,
        updatedInterval: ['1m', '1m'],
      })
    ).resolves.toBe(undefined);
  });

  test('should throw if the updated interval exceeds limits', () => {
    return expect(
      validateScheduleLimit({
        context,
        updatedInterval: ['1m', '1m', '1m', '2m'],
      })
    ).rejects.toThrowError('Failed to validate schedule limit: limit reached (3/min < 3.5/min)');
  });

  test('should not throw if previous interval was modified to be under the limit', () => {
    unsecuredSavedObjectsClient.find.mockResolvedValue(
      getMockAggregationResult([{ interval: '1m', count: 6 }])
    );

    return expect(
      validateScheduleLimit({
        context,
        prevInterval: ['1m', '1m'],
        updatedInterval: ['2m', '2m'],
      })
    ).resolves.toBe(undefined);
  });

  test('should throw if the previous interval was modified to exceed the limit', () => {
    unsecuredSavedObjectsClient.find.mockResolvedValue(
      getMockAggregationResult([{ interval: '1m', count: 5 }])
    );

    return expect(
      validateScheduleLimit({
        context,
        prevInterval: ['1m'],
        updatedInterval: ['30s'],
      })
    ).rejects.toThrowError('Failed to validate schedule limit: limit reached (1/min < 2/min)');
  });
});
