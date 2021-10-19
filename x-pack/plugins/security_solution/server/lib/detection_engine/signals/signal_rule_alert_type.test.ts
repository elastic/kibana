/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { estypes } from '@elastic/elasticsearch';
import { loggingSystemMock } from 'src/core/server/mocks';
import { getAlertMock } from '../routes/__mocks__/request_responses';
import { signalRulesAlertType } from './signal_rule_alert_type';
import { alertsMock, AlertServicesMock } from '../../../../../alerting/server/mocks';
import {
  getListsClient,
  getExceptions,
  checkPrivileges,
  createSearchAfterReturnType,
} from './utils';
import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';
import { RuleExecutorOptions, SearchAfterAndBulkCreateReturnType } from './types';
import { RuleAlertType } from '../rules/types';
import { listMock } from '../../../../../lists/server/mocks';
import { getListClientMock } from '../../../../../lists/server/services/lists/list_client.mock';
import { getExceptionListClientMock } from '../../../../../lists/server/services/exception_lists/exception_list_client.mock';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { ApiResponse } from '@elastic/elasticsearch/lib/Transport';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { queryExecutor } from './executors/query';
import { mlExecutor } from './executors/ml';
import { getMlRuleParams, getQueryRuleParams } from '../schemas/rule_schemas.mock';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { allowedExperimentalValues } from '../../../../common/experimental_features';
import { scheduleNotificationActions } from '../notifications/schedule_notification_actions';
import { ruleExecutionLogClientMock } from '../rule_execution_log/__mocks__/rule_execution_log_client';
import { RuleExecutionStatus } from '../../../../common/detection_engine/schemas/common/schemas';
import { scheduleThrottledNotificationActions } from '../notifications/schedule_throttle_notification_actions';
import { eventLogServiceMock } from '../../../../../event_log/server/mocks';
import { createMockConfig } from '../routes/__mocks__';

jest.mock('./utils', () => {
  const original = jest.requireActual('./utils');
  return {
    ...original,
    getListsClient: jest.fn(),
    getExceptions: jest.fn(),
    sortExceptionItems: jest.fn(),
    checkPrivileges: jest.fn(),
  };
});
jest.mock('../notifications/schedule_notification_actions');
jest.mock('./executors/query');
jest.mock('./executors/ml');
jest.mock('@kbn/securitysolution-io-ts-utils', () => {
  const original = jest.requireActual('@kbn/securitysolution-io-ts-utils');
  return {
    ...original,
    parseScheduleDates: jest.fn(),
  };
});
jest.mock('../notifications/schedule_throttle_notification_actions');
const mockRuleExecutionLogClient = ruleExecutionLogClientMock.create();

jest.mock('../rule_execution_log/rule_execution_log_client', () => ({
  RuleExecutionLogClient: jest.fn().mockImplementation(() => mockRuleExecutionLogClient),
}));

const getPayload = (
  ruleAlert: RuleAlertType,
  services: AlertServicesMock
): RuleExecutorOptions => ({
  alertId: ruleAlert.id,
  services,
  name: ruleAlert.name,
  tags: ruleAlert.tags,
  params: {
    ...ruleAlert.params,
  },
  state: {},
  spaceId: '',
  startedAt: new Date('2019-12-13T16:50:33.400Z'),
  previousStartedAt: new Date('2019-12-13T16:40:33.400Z'),
  createdBy: 'elastic',
  updatedBy: 'elastic',
  rule: {
    name: ruleAlert.name,
    tags: ruleAlert.tags,
    consumer: 'foo',
    producer: 'foo',
    ruleTypeId: 'ruleType',
    ruleTypeName: 'Name of rule',
    enabled: true,
    schedule: {
      interval: '1h',
    },
    actions: [],
    createdBy: 'elastic',
    updatedBy: 'elastic',
    createdAt: new Date('2019-12-13T16:50:33.400Z'),
    updatedAt: new Date('2019-12-13T16:50:33.400Z'),
    throttle: null,
    notifyWhen: null,
  },
});

describe('signal_rule_alert_type', () => {
  const version = '8.0.0';
  const jobsSummaryMock = jest.fn();
  const mlMock = {
    mlClient: {
      callAsInternalUser: jest.fn(),
      close: jest.fn(),
      asScoped: jest.fn(),
    },
    jobServiceProvider: jest.fn().mockReturnValue({
      jobsSummary: jobsSummaryMock,
    }),
    anomalyDetectorsProvider: jest.fn(),
    mlSystemProvider: jest.fn(),
    modulesProvider: jest.fn(),
    resultsServiceProvider: jest.fn(),
    alertingServiceProvider: jest.fn(),
  };
  let payload: jest.Mocked<RuleExecutorOptions>;
  let alert: ReturnType<typeof signalRulesAlertType>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let alertServices: AlertServicesMock;
  let eventLogService: ReturnType<typeof eventLogServiceMock.create>;

  beforeEach(() => {
    alertServices = alertsMock.createAlertServices();
    logger = loggingSystemMock.createLogger();
    eventLogService = eventLogServiceMock.create();
    (getListsClient as jest.Mock).mockReturnValue({
      listClient: getListClientMock(),
      exceptionsClient: getExceptionListClientMock(),
    });
    (getExceptions as jest.Mock).mockReturnValue([getExceptionListItemSchemaMock()]);
    (checkPrivileges as jest.Mock).mockImplementation(async (_, indices) => {
      return {
        index: indices.reduce(
          (acc: { index: { [x: string]: { read: boolean } } }, index: string) => {
            return {
              [index]: {
                read: true,
              },
              ...acc,
            };
          },
          {}
        ),
      };
    });
    const executorReturnValue = createSearchAfterReturnType({
      createdSignalsCount: 10,
    });
    (queryExecutor as jest.Mock).mockClear();
    (queryExecutor as jest.Mock).mockResolvedValue(executorReturnValue);
    (mlExecutor as jest.Mock).mockClear();
    (mlExecutor as jest.Mock).mockResolvedValue(executorReturnValue);
    (parseScheduleDates as jest.Mock).mockReturnValue(moment(100));
    const value: Partial<ApiResponse<estypes.FieldCapsResponse>> = {
      statusCode: 200,
      body: {
        indices: ['index1', 'index2', 'index3', 'index4'],
        fields: {
          '@timestamp': {
            // @ts-expect-error not full interface
            date: {
              indices: ['index1', 'index2', 'index3', 'index4'],
              searchable: true,
              aggregatable: false,
            },
          },
        },
      },
    };
    alertServices.scopedClusterClient.asCurrentUser.fieldCaps.mockResolvedValue(
      value as ApiResponse<estypes.FieldCapsResponse>
    );
    const ruleAlert = getAlertMock(false, getQueryRuleParams());
    alertServices.savedObjectsClient.get.mockResolvedValue({
      id: 'id',
      type: 'type',
      references: [],
      attributes: ruleAlert,
    });

    payload = getPayload(ruleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;

    alert = signalRulesAlertType({
      experimentalFeatures: allowedExperimentalValues,
      logger,
      eventsTelemetry: undefined,
      version,
      ml: mlMock,
      lists: listMock.createSetup(),
      config: createMockConfig(),
      eventLogService,
    });

    mockRuleExecutionLogClient.logStatusChange.mockClear();
    (scheduleThrottledNotificationActions as jest.Mock).mockClear();
  });

  describe('executor', () => {
    it('should log success status if signals were created', async () => {
      payload.previousStartedAt = null;
      await alert.executor(payload);
      expect(mockRuleExecutionLogClient.logStatusChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          newStatus: RuleExecutionStatus.succeeded,
        })
      );
    });

    it('should warn about the gap between runs if gap is very large', async () => {
      payload.previousStartedAt = moment().subtract(100, 'm').toDate();
      await alert.executor(payload);
      expect(logger.warn).toHaveBeenCalled();
      expect(mockRuleExecutionLogClient.logStatusChange).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          newStatus: RuleExecutionStatus['going to run'],
        })
      );
      expect(mockRuleExecutionLogClient.logStatusChange).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          newStatus: RuleExecutionStatus.failed,
          metrics: {
            executionGap: expect.any(Object),
          },
        })
      );
    });

    it('should set a warning for when rules cannot read ALL provided indices', async () => {
      (checkPrivileges as jest.Mock).mockResolvedValueOnce({
        username: 'elastic',
        has_all_requested: false,
        cluster: {},
        index: {
          'myfa*': {
            read: true,
          },
          'anotherindex*': {
            read: true,
          },
          'some*': {
            read: false,
          },
        },
        application: {},
      });
      const newRuleAlert = getAlertMock(false, getQueryRuleParams());
      newRuleAlert.params.index = ['some*', 'myfa*', 'anotherindex*'];
      payload = getPayload(newRuleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;

      await alert.executor(payload);
      expect(mockRuleExecutionLogClient.logStatusChange).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          newStatus: RuleExecutionStatus['partial failure'],
          message: 'Missing required read privileges on the following indices: ["some*"]',
        })
      );
    });

    it('should set a failure status for when rules cannot read ANY provided indices', async () => {
      (checkPrivileges as jest.Mock).mockResolvedValueOnce({
        username: 'elastic',
        has_all_requested: false,
        cluster: {},
        index: {
          'myfa*': {
            read: false,
          },
          'some*': {
            read: false,
          },
        },
        application: {},
      });
      const newRuleAlert = getAlertMock(false, getQueryRuleParams());
      newRuleAlert.params.index = ['some*', 'myfa*', 'anotherindex*'];
      payload = getPayload(newRuleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;

      await alert.executor(payload);
      expect(mockRuleExecutionLogClient.logStatusChange).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          newStatus: RuleExecutionStatus['partial failure'],
          message:
            'This rule may not have the required read privileges to the following indices: ["myfa*","some*"]',
        })
      );
    });

    it('should NOT warn about the gap between runs if gap small', async () => {
      payload.previousStartedAt = moment().subtract(10, 'm').toDate();
      await alert.executor(payload);
      expect(logger.warn).toHaveBeenCalledTimes(0);
      expect(mockRuleExecutionLogClient.logStatusChange).toHaveBeenCalledTimes(2);
      expect(mockRuleExecutionLogClient.logStatusChange).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          newStatus: RuleExecutionStatus['going to run'],
        })
      );
      expect(mockRuleExecutionLogClient.logStatusChange).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          newStatus: RuleExecutionStatus.succeeded,
        })
      );
    });

    it('should call scheduleActions if signalsCount was greater than 0 and rule has actions defined', async () => {
      const ruleAlert = getAlertMock(false, getQueryRuleParams());
      ruleAlert.actions = [
        {
          actionTypeId: '.slack',
          params: {
            message:
              'Rule generated {{state.signals_count}} signals\n\n{{context.rule.name}}\n{{{context.results_link}}}',
          },
          group: 'default',
          id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
        },
      ];

      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });

      await alert.executor(payload);
    });

    it('should resolve results_link when meta is an empty object to use "/app/security"', async () => {
      const ruleAlert = getAlertMock(false, getQueryRuleParams());
      ruleAlert.params.meta = {};
      ruleAlert.actions = [
        {
          actionTypeId: '.slack',
          params: {
            message:
              'Rule generated {{state.signals_count}} signals\n\n{{context.rule.name}}\n{{{context.results_link}}}',
          },
          group: 'default',
          id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
        },
      ];

      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'rule-id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      payload.params.meta = {};

      await alert.executor(payload);

      expect(scheduleNotificationActions).toHaveBeenCalledWith(
        expect.objectContaining({
          resultsLink:
            '/app/security/detections/rules/id/rule-id?timerange=(global:(linkTo:!(timeline),timerange:(from:100,kind:absolute,to:100)),timeline:(linkTo:!(global),timerange:(from:100,kind:absolute,to:100)))',
        })
      );
    });

    it('should resolve results_link when meta is undefined use "/app/security"', async () => {
      const ruleAlert = getAlertMock(false, getQueryRuleParams());
      delete ruleAlert.params.meta;
      ruleAlert.actions = [
        {
          actionTypeId: '.slack',
          params: {
            message:
              'Rule generated {{state.signals_count}} signals\n\n{{context.rule.name}}\n{{{context.results_link}}}',
          },
          group: 'default',
          id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
        },
      ];

      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'rule-id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      delete payload.params.meta;

      await alert.executor(payload);

      expect(scheduleNotificationActions).toHaveBeenCalledWith(
        expect.objectContaining({
          resultsLink:
            '/app/security/detections/rules/id/rule-id?timerange=(global:(linkTo:!(timeline),timerange:(from:100,kind:absolute,to:100)),timeline:(linkTo:!(global),timerange:(from:100,kind:absolute,to:100)))',
        })
      );
    });

    it('should resolve results_link with a custom link', async () => {
      const ruleAlert = getAlertMock(false, getQueryRuleParams());
      ruleAlert.params.meta = { kibana_siem_app_url: 'http://localhost' };
      ruleAlert.actions = [
        {
          actionTypeId: '.slack',
          params: {
            message:
              'Rule generated {{state.signals_count}} signals\n\n{{context.rule.name}}\n{{{context.results_link}}}',
          },
          group: 'default',
          id: '99403909-ca9b-49ba-9d7a-7e5320e68d05',
        },
      ];

      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'rule-id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      payload.params.meta = { kibana_siem_app_url: 'http://localhost' };

      await alert.executor(payload);

      expect(scheduleNotificationActions).toHaveBeenCalledWith(
        expect.objectContaining({
          resultsLink:
            'http://localhost/detections/rules/id/rule-id?timerange=(global:(linkTo:!(timeline),timerange:(from:100,kind:absolute,to:100)),timeline:(linkTo:!(global),timerange:(from:100,kind:absolute,to:100)))',
        })
      );
    });

    describe('ML rule', () => {
      it('should not call checkPrivileges if ML rule', async () => {
        const ruleAlert = getAlertMock(false, getMlRuleParams());
        alertServices.savedObjectsClient.get.mockResolvedValue({
          id: 'id',
          type: 'type',
          references: [],
          attributes: ruleAlert,
        });
        payload = getPayload(ruleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;
        payload.previousStartedAt = null;
        (checkPrivileges as jest.Mock).mockClear();

        await alert.executor(payload);
        expect(checkPrivileges).toHaveBeenCalledTimes(0);
        expect(mockRuleExecutionLogClient.logStatusChange).toHaveBeenLastCalledWith(
          expect.objectContaining({
            newStatus: RuleExecutionStatus.succeeded,
          })
        );
      });
    });
  });

  describe('should catch error', () => {
    it('when bulk indexing failed', async () => {
      const result: SearchAfterAndBulkCreateReturnType = {
        success: false,
        warning: false,
        searchAfterTimes: [],
        bulkCreateTimes: [],
        lastLookBackDate: null,
        createdSignalsCount: 0,
        createdSignals: [],
        warningMessages: [],
        errors: ['Error that bubbled up.'],
      };
      (queryExecutor as jest.Mock).mockResolvedValue(result);
      await alert.executor(payload);
      expect(logger.error).toHaveBeenCalled();
      expect(logger.error.mock.calls[0][0]).toContain(
        'Bulk Indexing of signals failed: Error that bubbled up. name: "Detect Root/Admin Users" id: "04128c15-0d1b-4716-a4c5-46997ac7f3bd" rule id: "rule-1" signals index: ".siem-signals"'
      );
      expect(mockRuleExecutionLogClient.logStatusChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          newStatus: RuleExecutionStatus.failed,
        })
      );
    });

    it('when error was thrown', async () => {
      (queryExecutor as jest.Mock).mockRejectedValue({});
      await alert.executor(payload);
      expect(logger.error).toHaveBeenCalled();
      expect(logger.error.mock.calls[0][0]).toContain('An error occurred during rule execution');
      expect(mockRuleExecutionLogClient.logStatusChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          newStatus: RuleExecutionStatus.failed,
        })
      );
    });

    it('and log failure with the default message', async () => {
      (queryExecutor as jest.Mock).mockReturnValue(
        elasticsearchClientMock.createErrorTransportRequestPromise(
          new ResponseError(
            elasticsearchClientMock.createApiResponse({
              statusCode: 400,
              body: { error: { type: 'some_error_type' } },
            })
          )
        )
      );
      await alert.executor(payload);
      expect(logger.error).toHaveBeenCalled();
      expect(logger.error.mock.calls[0][0]).toContain('An error occurred during rule execution');
      expect(mockRuleExecutionLogClient.logStatusChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          newStatus: RuleExecutionStatus.failed,
        })
      );
    });

    it('should call scheduleThrottledNotificationActions if result is false to prevent the throttle from being reset', async () => {
      const result: SearchAfterAndBulkCreateReturnType = {
        success: false,
        warning: false,
        searchAfterTimes: [],
        bulkCreateTimes: [],
        lastLookBackDate: null,
        createdSignalsCount: 0,
        createdSignals: [],
        warningMessages: [],
        errors: ['Error that bubbled up.'],
      };
      (queryExecutor as jest.Mock).mockResolvedValue(result);
      const ruleAlert = getAlertMock(false, getQueryRuleParams());
      ruleAlert.throttle = '1h';
      const payLoadWithThrottle = getPayload(
        ruleAlert,
        alertServices
      ) as jest.Mocked<RuleExecutorOptions>;
      payLoadWithThrottle.rule.throttle = '1h';
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      await alert.executor(payLoadWithThrottle);
      expect(scheduleThrottledNotificationActions).toHaveBeenCalledTimes(1);
    });

    it('should NOT call scheduleThrottledNotificationActions if result is false and the throttle is not set', async () => {
      const result: SearchAfterAndBulkCreateReturnType = {
        success: false,
        warning: false,
        searchAfterTimes: [],
        bulkCreateTimes: [],
        lastLookBackDate: null,
        createdSignalsCount: 0,
        createdSignals: [],
        warningMessages: [],
        errors: ['Error that bubbled up.'],
      };
      (queryExecutor as jest.Mock).mockResolvedValue(result);
      await alert.executor(payload);
      expect(scheduleThrottledNotificationActions).toHaveBeenCalledTimes(0);
    });

    it('should call scheduleThrottledNotificationActions if an error was thrown to prevent the throttle from being reset', async () => {
      (queryExecutor as jest.Mock).mockRejectedValue({});
      const ruleAlert = getAlertMock(false, getQueryRuleParams());
      ruleAlert.throttle = '1h';
      const payLoadWithThrottle = getPayload(
        ruleAlert,
        alertServices
      ) as jest.Mocked<RuleExecutorOptions>;
      payLoadWithThrottle.rule.throttle = '1h';
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      await alert.executor(payLoadWithThrottle);
      expect(scheduleThrottledNotificationActions).toHaveBeenCalledTimes(1);
    });

    it('should NOT call scheduleThrottledNotificationActions if an error was thrown to prevent the throttle from being reset if throttle is not defined', async () => {
      const result: SearchAfterAndBulkCreateReturnType = {
        success: false,
        warning: false,
        searchAfterTimes: [],
        bulkCreateTimes: [],
        lastLookBackDate: null,
        createdSignalsCount: 0,
        createdSignals: [],
        warningMessages: [],
        errors: ['Error that bubbled up.'],
      };
      (queryExecutor as jest.Mock).mockRejectedValue(result);
      await alert.executor(payload);
      expect(scheduleThrottledNotificationActions).toHaveBeenCalledTimes(0);
    });
  });
});
