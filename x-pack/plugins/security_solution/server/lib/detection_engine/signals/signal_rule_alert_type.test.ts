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
import { ruleStatusServiceFactory } from './rule_status_service';
import {
  getListsClient,
  getExceptions,
  checkPrivileges,
  createSearchAfterReturnType,
} from './utils';
import * as parseScheduleDates from '../../../../common/detection_engine/parse_schedule_dates';
import { RuleExecutorOptions, SearchAfterAndBulkCreateReturnType } from './types';
import { scheduleNotificationActions } from '../notifications/schedule_notification_actions';
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

jest.mock('./rule_status_saved_objects_client');
jest.mock('./rule_status_service');
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
  let ruleStatusService: Record<string, jest.Mock>;

  beforeEach(() => {
    alertServices = alertsMock.createAlertServices();
    logger = loggingSystemMock.createLogger();
    ruleStatusService = {
      success: jest.fn(),
      find: jest.fn(),
      goingToRun: jest.fn(),
      error: jest.fn(),
      partialFailure: jest.fn(),
    };
    (ruleStatusServiceFactory as jest.Mock).mockReturnValue(ruleStatusService);
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
    const value: Partial<ApiResponse<estypes.FieldCapabilitiesResponse>> = {
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
      value as ApiResponse<estypes.FieldCapabilitiesResponse>
    );
    const ruleAlert = getAlertMock(getQueryRuleParams());
    alertServices.savedObjectsClient.get.mockResolvedValue({
      id: 'id',
      type: 'type',
      references: [],
      attributes: ruleAlert,
    });

    payload = getPayload(ruleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;

    alert = signalRulesAlertType({
      logger,
      eventsTelemetry: undefined,
      version,
      ml: mlMock,
      lists: listMock.createSetup(),
    });
  });

  describe('executor', () => {
    it('should call ruleStatusService.success if signals were created', async () => {
      payload.previousStartedAt = null;
      await alert.executor(payload);
      expect(ruleStatusService.success).toHaveBeenCalled();
    });

    it('should warn about the gap between runs if gap is very large', async () => {
      payload.previousStartedAt = moment().subtract(100, 'm').toDate();
      await alert.executor(payload);
      expect(logger.warn).toHaveBeenCalled();
      expect(ruleStatusService.error).toHaveBeenCalled();
      expect(ruleStatusService.error.mock.calls[0][1]).toEqual({
        gap: 'an hour',
      });
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
      const newRuleAlert = getAlertMock(getQueryRuleParams());
      newRuleAlert.params.index = ['some*', 'myfa*', 'anotherindex*'];
      payload = getPayload(newRuleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;

      await alert.executor(payload);
      expect(ruleStatusService.partialFailure).toHaveBeenCalled();
      expect(ruleStatusService.partialFailure.mock.calls[0][0]).toContain(
        'Missing required read privileges on the following indices: ["some*"]'
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
      const newRuleAlert = getAlertMock(getQueryRuleParams());
      newRuleAlert.params.index = ['some*', 'myfa*', 'anotherindex*'];
      payload = getPayload(newRuleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;

      await alert.executor(payload);
      expect(ruleStatusService.partialFailure).toHaveBeenCalled();
      expect(ruleStatusService.partialFailure.mock.calls[0][0]).toContain(
        'This rule may not have the required read privileges to the following indices: ["myfa*","some*"]'
      );
    });

    it('should NOT warn about the gap between runs if gap small', async () => {
      payload.previousStartedAt = moment().subtract(10, 'm').toDate();
      await alert.executor(payload);
      expect(logger.warn).toHaveBeenCalledTimes(0);
      expect(ruleStatusService.error).toHaveBeenCalledTimes(0);
    });

    it("should set refresh to 'wait_for' when actions are present", async () => {
      const ruleAlert = getAlertMock(getQueryRuleParams());
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
      expect((queryExecutor as jest.Mock).mock.calls[0][0].refresh).toEqual('wait_for');
    });

    it('should set refresh to false when actions are not present', async () => {
      await alert.executor(payload);
      expect((queryExecutor as jest.Mock).mock.calls[0][0].refresh).toEqual(false);
    });

    it('should call scheduleActions if signalsCount was greater than 0 and rule has actions defined', async () => {
      const ruleAlert = getAlertMock(getQueryRuleParams());
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

      expect(scheduleNotificationActions).toHaveBeenCalledWith(
        expect.objectContaining({
          signalsCount: 10,
        })
      );
    });

    it('should resolve results_link when meta is an empty object to use "/app/security"', async () => {
      const ruleAlert = getAlertMock(getQueryRuleParams());
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

      const parseScheduleDatesSpy = jest
        .spyOn(parseScheduleDates, 'parseScheduleDates')
        .mockReturnValue(moment(100));
      await alert.executor(payload);
      parseScheduleDatesSpy.mockRestore();

      expect(scheduleNotificationActions).toHaveBeenCalledWith(
        expect.objectContaining({
          resultsLink:
            '/app/security/detections/rules/id/rule-id?timerange=(global:(linkTo:!(timeline),timerange:(from:100,kind:absolute,to:100)),timeline:(linkTo:!(global),timerange:(from:100,kind:absolute,to:100)))',
        })
      );
    });

    it('should resolve results_link when meta is undefined use "/app/security"', async () => {
      const ruleAlert = getAlertMock(getQueryRuleParams());
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

      const parseScheduleDatesSpy = jest
        .spyOn(parseScheduleDates, 'parseScheduleDates')
        .mockReturnValue(moment(100));
      await alert.executor(payload);
      parseScheduleDatesSpy.mockRestore();

      expect(scheduleNotificationActions).toHaveBeenCalledWith(
        expect.objectContaining({
          resultsLink:
            '/app/security/detections/rules/id/rule-id?timerange=(global:(linkTo:!(timeline),timerange:(from:100,kind:absolute,to:100)),timeline:(linkTo:!(global),timerange:(from:100,kind:absolute,to:100)))',
        })
      );
    });

    it('should resolve results_link with a custom link', async () => {
      const ruleAlert = getAlertMock(getQueryRuleParams());
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

      const parseScheduleDatesSpy = jest
        .spyOn(parseScheduleDates, 'parseScheduleDates')
        .mockReturnValue(moment(100));
      await alert.executor(payload);
      parseScheduleDatesSpy.mockRestore();

      expect(scheduleNotificationActions).toHaveBeenCalledWith(
        expect.objectContaining({
          resultsLink:
            'http://localhost/detections/rules/id/rule-id?timerange=(global:(linkTo:!(timeline),timerange:(from:100,kind:absolute,to:100)),timeline:(linkTo:!(global),timerange:(from:100,kind:absolute,to:100)))',
        })
      );
    });

    describe('ML rule', () => {
      it('should not call checkPrivileges if ML rule', async () => {
        const ruleAlert = getAlertMock(getMlRuleParams());
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
        expect(ruleStatusService.success).toHaveBeenCalled();
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
        errors: ['Error that bubbled up.'],
      };
      (queryExecutor as jest.Mock).mockResolvedValue(result);
      await alert.executor(payload);
      expect(logger.error).toHaveBeenCalled();
      expect(logger.error.mock.calls[0][0]).toContain(
        'Bulk Indexing of signals failed: Error that bubbled up. name: "Detect Root/Admin Users" id: "04128c15-0d1b-4716-a4c5-46997ac7f3bd" rule id: "rule-1" signals index: ".siem-signals"'
      );
      expect(ruleStatusService.error).toHaveBeenCalled();
    });

    it('when error was thrown', async () => {
      (queryExecutor as jest.Mock).mockRejectedValue({});
      await alert.executor(payload);
      expect(logger.error).toHaveBeenCalled();
      expect(logger.error.mock.calls[0][0]).toContain('An error occurred during rule execution');
      expect(ruleStatusService.error).toHaveBeenCalled();
    });

    it('and call ruleStatusService with the default message', async () => {
      (queryExecutor as jest.Mock).mockRejectedValue(
        elasticsearchClientMock.createErrorTransportRequestPromise({})
      );
      await alert.executor(payload);
      expect(logger.error).toHaveBeenCalled();
      expect(logger.error.mock.calls[0][0]).toContain('An error occurred during rule execution');
      expect(ruleStatusService.error).toHaveBeenCalled();
    });
  });
});
