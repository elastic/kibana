/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adHocRunStatus } from '../../common/constants';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { SavedObject, SavedObjectsBulkResponse } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { ScheduleBackfillParam } from '../application/backfill/methods/schedule/types';
import { RuleDomain } from '../application/rule/types';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import { BackfillClient } from './backfill_client';
import { AdHocRunSO } from '../data/ad_hoc_run/types';
import { transformAdHocRunToBackfillResult } from '../application/backfill/transforms';
import { RecoveredActionGroup } from '@kbn/alerting-types';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';

const logger = loggingSystemMock.create().get();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const auditLogger = auditLoggerMock.create();

function getMockData(overwrites: Record<string, unknown> = {}): ScheduleBackfillParam {
  return {
    ruleId: '1',
    start: '2023-11-16T08:00:00.000Z',
    ...overwrites,
  };
}

const MOCK_API_KEY = Buffer.from('123:abc').toString('base64');
function getMockRule(overwrites: Record<string, unknown> = {}): RuleDomain {
  return {
    id: '1',
    actions: [],
    alertTypeId: 'myType',
    apiKey: MOCK_API_KEY,
    apiKeyCreatedByUser: false,
    apiKeyOwner: 'user',
    consumer: 'myApp',
    createdAt: new Date('2019-02-12T21:01:22.479Z'),
    createdBy: 'user',
    enabled: true,
    executionStatus: {
      lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
      status: 'pending',
    },
    muteAll: false,
    mutedInstanceIds: [],
    name: 'my rule name',
    notifyWhen: null,
    // @ts-expect-error
    params: {},
    revision: 0,
    schedule: { interval: '12h' },
    scheduledTaskId: 'task-123',
    snoozeSchedule: [],
    tags: ['foo'],
    throttle: null,
    updatedAt: new Date('2019-02-12T21:01:22.479Z'),
    updatedBy: 'user',
    ...overwrites,
  };
}

function getMockAdHocRunAttributes({
  ruleId,
  overwrites,
  omitApiKey = false,
}: {
  ruleId?: string;
  overwrites?: Record<string, unknown>;
  omitApiKey?: boolean;
} = {}): AdHocRunSO {
  return {
    ...(omitApiKey ? {} : { apiKeyId: '123', apiKeyToUse: 'MTIzOmFiYw==' }),
    createdAt: '2024-01-30T00:00:00.000Z',
    duration: '12h',
    enabled: true,
    rule: {
      ...(ruleId ? { id: ruleId } : {}),
      name: 'my rule name',
      tags: ['foo'],
      alertTypeId: 'myType',
      // @ts-expect-error
      params: {},
      apiKeyOwner: 'user',
      apiKeyCreatedByUser: false,
      consumer: 'myApp',
      enabled: true,
      schedule: {
        interval: '12h',
      },
      createdBy: 'user',
      updatedBy: 'user',
      createdAt: '2019-02-12T21:01:22.479Z',
      updatedAt: '2019-02-12T21:01:22.479Z',
      revision: 0,
    },
    spaceId: 'default',
    start: '2023-10-19T15:07:40.011Z',
    status: adHocRunStatus.PENDING,
    schedule: [
      {
        interval: '12h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-10-20T03:07:40.011Z',
      },
      {
        interval: '12h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-10-20T15:07:40.011Z',
      },
    ],
    ...overwrites,
  };
}

function getBulkCreateParam(
  id: string,
  ruleId: string,
  attributes: AdHocRunSO
): SavedObject<AdHocRunSO> {
  return {
    type: 'ad_hoc_rule_run_params',
    id,
    namespaces: ['default'],
    attributes,
    references: [
      {
        id: ruleId,
        name: 'rule',
        type: 'alert',
      },
    ],
    managed: false,
    coreMigrationVersion: '8.8.0',
    updated_at: '2024-02-07T16:05:39.296Z',
    created_at: '2024-02-07T16:05:39.296Z',
    version: 'WzcsMV0=',
  };
}

describe('BackfillClient', () => {
  let backfillClient: BackfillClient;

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-30T00:00:00.000Z'));
  });

  beforeEach(() => {
    jest.resetAllMocks();
    ruleTypeRegistry.get.mockReturnValue({
      id: 'myType',
      name: 'Test',
      actionGroups: [
        { id: 'default', name: 'Default' },
        { id: 'custom', name: 'Not the Default' },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      recoveryActionGroup: RecoveredActionGroup,
      async executor() {
        return { state: {} };
      },
      category: 'test',
      producer: 'alerts',
      validate: {
        params: { validate: (params) => params },
      },
      validLegacyConsumers: [],
      autoRecoverAlerts: false,
    });
    backfillClient = new BackfillClient({ logger });
  });

  afterAll(() => jest.useRealTimers());

  describe('bulkQueue()', () => {
    test('should successfully create backfill saved objects', async () => {
      const mockData = [
        getMockData(),
        getMockData({ ruleId: '2', end: '2023-11-17T08:00:00.000Z' }),
      ];
      const rule1 = getMockRule();
      const rule2 = getMockRule({ id: '2' });
      const mockRules = [rule1, rule2];

      const mockAttributes1 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T20:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });
      const mockAttributes2 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-17T08:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
            {
              runAt: '2023-11-17T08:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });
      const bulkCreateResult = {
        saved_objects: [
          getBulkCreateParam('abc', '1', mockAttributes1),
          getBulkCreateParam('def', '2', mockAttributes2),
        ],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      const result = await backfillClient.bulkQueue({
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith([
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: mockAttributes1,
          references: [{ id: rule1.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: mockAttributes2,
          references: [{ id: rule2.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
      ]);
      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'def', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=def]',
      });
      expect(result).toEqual(bulkCreateResult.saved_objects.map(transformAdHocRunToBackfillResult));
    });

    test('should successfully create multiple backfill saved objects for a single rule', async () => {
      const mockData = [getMockData(), getMockData({ end: '2023-11-17T08:00:00.000Z' })];
      const rule1 = getMockRule();
      const mockRules = [rule1];

      const mockAttributes1 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T20:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });
      const mockAttributes2 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-17T08:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
            {
              runAt: '2023-11-17T08:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });
      const bulkCreateResult = {
        saved_objects: [
          getBulkCreateParam('abc', '1', mockAttributes1),
          getBulkCreateParam('def', '1', mockAttributes2),
        ],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      const result = await backfillClient.bulkQueue({
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith([
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: mockAttributes1,
          references: [{ id: rule1.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: mockAttributes2,
          references: [{ id: rule1.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
      ]);
      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'def', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=def]',
      });
      expect(result).toEqual(bulkCreateResult.saved_objects.map(transformAdHocRunToBackfillResult));
    });

    test('should log warning if no rule found for backfill job', async () => {
      const mockData = [
        getMockData(),
        getMockData({ ruleId: '2', end: '2023-11-17T08:00:00.000Z' }),
      ];
      const rule1 = getMockRule();
      const mockRules = [rule1];

      const mockAttributes1 = getMockAdHocRunAttributes({
        overwrites: {
          start: '2023-11-16T08:00:00.000Z',
          end: '2023-11-16T20:00:00.000Z',
          schedule: [
            {
              runAt: '2023-11-16T20:00:00.000Z',
              interval: '12h',
              status: adHocRunStatus.PENDING,
            },
          ],
        },
      });

      const bulkCreateResult = {
        saved_objects: [getBulkCreateParam('abc', '1', mockAttributes1)],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(bulkCreateResult);

      const result = await backfillClient.bulkQueue({
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith([
        {
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          attributes: mockAttributes1,
          references: [{ id: rule1.id, name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
        },
      ]);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        `No rule found for ruleId 2 - not scheduling backfill for {\"ruleId\":\"2\",\"start\":\"2023-11-16T08:00:00.000Z\",\"end\":\"2023-11-17T08:00:00.000Z\"}`
      );
      expect(result).toEqual([
        ...bulkCreateResult.saved_objects.map(transformAdHocRunToBackfillResult),
        {
          error: {
            error: 'Not Found',
            message: 'Saved object [alert/2] not found',
          },
        },
      ]);
    });

    test('should return backfill result or error message for each backfill param', async () => {
      ruleTypeRegistry.get.mockReturnValueOnce({
        id: 'myType',
        name: 'Test',
        actionGroups: [
          { id: 'default', name: 'Default' },
          { id: 'custom', name: 'Not the Default' },
        ],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        async executor() {
          return { state: {} };
        },
        category: 'test',
        producer: 'alerts',
        validate: {
          params: { validate: (params) => params },
        },
        validLegacyConsumers: [],
        autoRecoverAlerts: true,
      });
      const mockData = [
        getMockData(), // this should return error due to unsupported rule type
        getMockData(), // this should succeed
        getMockData({ ruleId: '2', end: '2023-11-16T10:00:00.000Z' }), // this should return rule not found error
        getMockData({ ruleId: '3', end: '2023-11-16T12:00:00.000Z' }), // this should succeed
        getMockData({ end: '2023-11-16T09:00:00.000Z' }), // this should succeed
        getMockData({ ruleId: '4' }), // this should return error from saved objects client bulk create
        getMockData({ ruleId: '5' }), // this should succeed
        getMockData({ ruleId: '6' }), // this should return error due to disabled rule
        getMockData({ ruleId: '7' }), // this should return error due to null api key
      ];
      const rule1 = getMockRule();
      const rule3 = getMockRule({ id: '3' });
      const rule4 = getMockRule({ id: '4' });
      const rule5 = getMockRule({ id: '5' });
      const rule6 = getMockRule({ id: '6', enabled: false });
      const rule7 = getMockRule({ id: '7', apiKey: null });
      const mockRules = [rule1, rule3, rule4, rule5, rule6, rule7];

      const mockAttributes = getMockAdHocRunAttributes();

      const bulkCreateResult = {
        saved_objects: [
          getBulkCreateParam('abc', '1', mockAttributes),
          getBulkCreateParam('def', '3', mockAttributes),
          getBulkCreateParam('ghi', '1', mockAttributes),
          {
            type: 'ad_hoc_rule_run_params',
            error: {
              error: 'my error',
              message: 'Unable to create',
            },
          },
          getBulkCreateParam('jkl', '5', mockAttributes),
        ],
      };

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValueOnce(
        bulkCreateResult as SavedObjectsBulkResponse<AdHocRunSO>
      );
      const result = await backfillClient.bulkQueue({
        auditLogger,
        params: mockData,
        rules: mockRules,
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
      });
      expect(auditLogger.log).toHaveBeenCalledTimes(5);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'abc', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=abc]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'def', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=def]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(3, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'ghi', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=ghi]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(4, {
        error: { code: 'Error', message: 'Unable to create' },
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'failure',
          type: ['creation'],
        },
        kibana: {},
        message: 'Failed attempt to create ad hoc run for an ad hoc run',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(5, {
        event: {
          action: 'ad_hoc_run_create',
          category: ['database'],
          outcome: 'success',
          type: ['creation'],
        },
        kibana: { saved_object: { id: 'jkl', type: 'ad_hoc_run_params' } },
        message: 'User has created ad hoc run for ad_hoc_run_params [id=jkl]',
      });

      expect(result).toEqual([
        {
          error: {
            error: 'Bad Request',
            message: 'Rule type "myType" for rule 1 is not supported',
          },
        },
        {
          id: 'abc',
          ...getMockAdHocRunAttributes({ ruleId: '1', omitApiKey: true }),
        },
        {
          error: {
            error: 'Not Found',
            message: 'Saved object [alert/2] not found',
          },
        },
        {
          id: 'def',
          ...getMockAdHocRunAttributes({ ruleId: '3', omitApiKey: true }),
        },
        {
          id: 'ghi',
          ...getMockAdHocRunAttributes({ ruleId: '1', omitApiKey: true }),
        },
        {
          error: {
            error: 'my error',
            message: 'Unable to create',
          },
        },
        {
          id: 'jkl',
          ...getMockAdHocRunAttributes({ ruleId: '5', omitApiKey: true }),
        },
        {
          error: {
            error: 'Bad Request',
            message: 'Rule 6 is disabled',
          },
        },
        {
          error: {
            error: 'Bad Request',
            message: 'Rule 7 has no API key',
          },
        },
      ]);
    });

    test('should skip calling bulkCreate if no rules found for any backfill job', async () => {
      const mockData = [
        getMockData(), // this should succeed
        getMockData({ ruleId: '2', end: '2023-11-16T10:00:00.000Z' }), // this should return rule not found error
        getMockData({ ruleId: '3', end: '2023-11-16T12:00:00.000Z' }), // this should succeed
        getMockData({ end: '2023-11-16T09:00:00.000Z' }), // this should succeed
        getMockData({ ruleId: '4' }), // this should return error from saved objects client bulk create
        getMockData({ ruleId: '5' }), // this should succeed
      ];

      const result = await backfillClient.bulkQueue({
        auditLogger,
        params: mockData,
        rules: [],
        ruleTypeRegistry,
        spaceId: 'default',
        unsecuredSavedObjectsClient,
      });

      expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled();
      expect(result).toEqual([
        {
          error: {
            error: 'Not Found',
            message: 'Saved object [alert/1] not found',
          },
        },
        {
          error: {
            error: 'Not Found',
            message: 'Saved object [alert/2] not found',
          },
        },
        {
          error: {
            error: 'Not Found',
            message: 'Saved object [alert/3] not found',
          },
        },
        {
          error: {
            error: 'Not Found',
            message: 'Saved object [alert/1] not found',
          },
        },
        {
          error: {
            error: 'Not Found',
            message: 'Saved object [alert/4] not found',
          },
        },
        {
          error: {
            error: 'Not Found',
            message: 'Saved object [alert/5] not found',
          },
        },
      ]);
    });
  });
});
