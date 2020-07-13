/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { loggingSystemMock } from 'src/core/server/mocks';
import { getResult, getMlResult } from '../routes/__mocks__/request_responses';
import { signalRulesAlertType } from './signal_rule_alert_type';
import { alertsMock, AlertServicesMock } from '../../../../../alerts/server/mocks';
import { ruleStatusServiceFactory } from './rule_status_service';
import {
  getGapBetweenRuns,
  getGapMaxCatchupRatio,
  getListsClient,
  getExceptions,
  sortExceptionItems,
} from './utils';
import { RuleExecutorOptions } from './types';
import { searchAfterAndBulkCreate } from './search_after_bulk_create';
import { scheduleNotificationActions } from '../notifications/schedule_notification_actions';
import { RuleAlertType } from '../rules/types';
import { findMlSignals } from './find_ml_signals';
import { bulkCreateMlSignals } from './bulk_create_ml_signals';
import { listMock } from '../../../../../lists/server/mocks';
import { getListClientMock } from '../../../../../lists/server/services/lists/list_client.mock';
import { getExceptionListClientMock } from '../../../../../lists/server/services/exception_lists/exception_list_client.mock';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';

jest.mock('./rule_status_saved_objects_client');
jest.mock('./rule_status_service');
jest.mock('./search_after_bulk_create');
jest.mock('./get_filter');
jest.mock('./utils');
jest.mock('../notifications/schedule_notification_actions');
jest.mock('./find_ml_signals');
jest.mock('./bulk_create_ml_signals');

const getPayload = (ruleAlert: RuleAlertType, services: AlertServicesMock) => ({
  alertId: ruleAlert.id,
  services,
  params: {
    ...ruleAlert.params,
    actions: [],
    enabled: ruleAlert.enabled,
    interval: ruleAlert.schedule.interval,
    name: ruleAlert.name,
    tags: ruleAlert.tags,
    throttle: ruleAlert.throttle,
  },
  state: {},
  spaceId: '',
  name: 'name',
  tags: [],
  startedAt: new Date('2019-12-13T16:50:33.400Z'),
  previousStartedAt: new Date('2019-12-13T16:40:33.400Z'),
  createdBy: 'elastic',
  updatedBy: 'elastic',
});

describe('rules_notification_alert_type', () => {
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
    };
    (ruleStatusServiceFactory as jest.Mock).mockReturnValue(ruleStatusService);
    (getGapBetweenRuns as jest.Mock).mockReturnValue(moment.duration(0));
    (getListsClient as jest.Mock).mockReturnValue({
      listClient: getListClientMock(),
      exceptionsClient: getExceptionListClientMock(),
    });
    (getExceptions as jest.Mock).mockReturnValue([getExceptionListItemSchemaMock()]);
    (sortExceptionItems as jest.Mock).mockReturnValue({
      exceptionsWithoutValueLists: [getExceptionListItemSchemaMock()],
      exceptionsWithValueLists: [],
    });
    (searchAfterAndBulkCreate as jest.Mock).mockClear();
    (getGapMaxCatchupRatio as jest.Mock).mockClear();
    (searchAfterAndBulkCreate as jest.Mock).mockResolvedValue({
      success: true,
      searchAfterTimes: [],
      createdSignalsCount: 10,
    });
    alertServices.callCluster.mockResolvedValue({
      hits: {
        total: { value: 10 },
      },
    });
    const ruleAlert = getResult();
    alertServices.savedObjectsClient.get.mockResolvedValue({
      id: 'id',
      type: 'type',
      references: [],
      attributes: ruleAlert,
    });

    payload = getPayload(ruleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;

    alert = signalRulesAlertType({
      logger,
      version,
      ml: mlMock,
      lists: listMock.createSetup(),
    });
  });

  describe('executor', () => {
    it('should warn about the gap between runs if gap is very large', async () => {
      (getGapBetweenRuns as jest.Mock).mockReturnValue(moment.duration(100, 'm'));
      (getGapMaxCatchupRatio as jest.Mock).mockReturnValue({
        maxCatchup: 4,
        ratio: 20,
        gapDiffInUnits: 95,
      });
      await alert.executor(payload);
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.warn.mock.calls[0][0]).toContain(
        '2 hours (6000000ms) has passed since last rule execution, and signals may have been missed.'
      );
      expect(ruleStatusService.error).toHaveBeenCalled();
      expect(ruleStatusService.error.mock.calls[0][0]).toContain(
        '2 hours (6000000ms) has passed since last rule execution, and signals may have been missed.'
      );
      expect(ruleStatusService.error.mock.calls[0][1]).toEqual({
        gap: '2 hours',
      });
    });

    it('should NOT warn about the gap between runs if gap small', async () => {
      (getGapBetweenRuns as jest.Mock).mockReturnValue(moment.duration(1, 'm'));
      (getGapMaxCatchupRatio as jest.Mock).mockReturnValue({
        maxCatchup: 1,
        ratio: 1,
        gapDiffInUnits: 1,
      });
      await alert.executor(payload);
      expect(logger.warn).toHaveBeenCalledTimes(0);
      expect(ruleStatusService.error).toHaveBeenCalledTimes(0);
    });

    it("should set refresh to 'wait_for' when actions are present", async () => {
      const ruleAlert = getResult();
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
      expect((searchAfterAndBulkCreate as jest.Mock).mock.calls[0][0].refresh).toEqual('wait_for');
      (searchAfterAndBulkCreate as jest.Mock).mockClear();
    });

    it('should set refresh to false when actions are not present', async () => {
      await alert.executor(payload);
      expect((searchAfterAndBulkCreate as jest.Mock).mock.calls[0][0].refresh).toEqual(false);
      (searchAfterAndBulkCreate as jest.Mock).mockClear();
    });

    it('should call scheduleActions if signalsCount was greater than 0 and rule has actions defined', async () => {
      const ruleAlert = getResult();
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

    describe('ML rule', () => {
      it('should throw an error if ML plugin was not available', async () => {
        const ruleAlert = getMlResult();
        payload = getPayload(ruleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;
        alert = signalRulesAlertType({
          logger,
          version,
          ml: undefined,
          lists: undefined,
        });
        await alert.executor(payload);
        expect(logger.error).toHaveBeenCalled();
        expect(logger.error.mock.calls[0][0]).toContain(
          'ML plugin unavailable during rule execution'
        );
      });

      it('should throw an error if machineLearningJobId or anomalyThreshold was not null', async () => {
        const ruleAlert = getMlResult();
        ruleAlert.params.anomalyThreshold = undefined;
        payload = getPayload(ruleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;
        await alert.executor(payload);
        expect(logger.error).toHaveBeenCalled();
        expect(logger.error.mock.calls[0][0]).toContain(
          'Machine learning rule is missing job id and/or anomaly threshold'
        );
      });

      it('should throw an error if Machine learning job summary was null', async () => {
        const ruleAlert = getMlResult();
        payload = getPayload(ruleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;
        jobsSummaryMock.mockResolvedValue([]);
        await alert.executor(payload);
        expect(logger.warn).toHaveBeenCalled();
        expect(logger.warn.mock.calls[0][0]).toContain('Machine learning job is not started');
        expect(ruleStatusService.error).toHaveBeenCalled();
        expect(ruleStatusService.error.mock.calls[0][0]).toContain(
          'Machine learning job is not started'
        );
      });

      it('should log an error if Machine learning job was not started', async () => {
        const ruleAlert = getMlResult();
        payload = getPayload(ruleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;
        jobsSummaryMock.mockResolvedValue([
          {
            id: 'some_job_id',
            jobState: 'starting',
            datafeedState: 'started',
          },
        ]);
        (findMlSignals as jest.Mock).mockResolvedValue({
          hits: {
            hits: [],
          },
        });
        await alert.executor(payload);
        expect(logger.warn).toHaveBeenCalled();
        expect(logger.warn.mock.calls[0][0]).toContain('Machine learning job is not started');
        expect(ruleStatusService.error).toHaveBeenCalled();
        expect(ruleStatusService.error.mock.calls[0][0]).toContain(
          'Machine learning job is not started'
        );
      });

      it('should not call ruleStatusService.success if no anomalies were found', async () => {
        const ruleAlert = getMlResult();
        payload = getPayload(ruleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;
        jobsSummaryMock.mockResolvedValue([]);
        (findMlSignals as jest.Mock).mockResolvedValue({
          hits: {
            hits: [],
          },
        });
        (bulkCreateMlSignals as jest.Mock).mockResolvedValue({
          success: true,
          bulkCreateDuration: 0,
          createdItemsCount: 0,
        });
        await alert.executor(payload);
        expect(ruleStatusService.success).not.toHaveBeenCalled();
      });

      it('should call ruleStatusService.success if signals were created', async () => {
        const ruleAlert = getMlResult();
        payload = getPayload(ruleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;
        jobsSummaryMock.mockResolvedValue([
          {
            id: 'some_job_id',
            jobState: 'started',
            datafeedState: 'started',
          },
        ]);
        (findMlSignals as jest.Mock).mockResolvedValue({
          hits: {
            hits: [{}],
          },
        });
        (bulkCreateMlSignals as jest.Mock).mockResolvedValue({
          success: true,
          bulkCreateDuration: 1,
          createdItemsCount: 1,
        });
        await alert.executor(payload);
        expect(ruleStatusService.success).toHaveBeenCalled();
      });

      it('should call scheduleActions if signalsCount was greater than 0 and rule has actions defined', async () => {
        const ruleAlert = getMlResult();
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
        payload = getPayload(ruleAlert, alertServices) as jest.Mocked<RuleExecutorOptions>;
        alertServices.savedObjectsClient.get.mockResolvedValue({
          id: 'id',
          type: 'type',
          references: [],
          attributes: ruleAlert,
        });
        jobsSummaryMock.mockResolvedValue([]);
        (findMlSignals as jest.Mock).mockResolvedValue({
          hits: {
            hits: [{}],
          },
        });
        (bulkCreateMlSignals as jest.Mock).mockResolvedValue({
          success: true,
          bulkCreateDuration: 1,
          createdItemsCount: 1,
        });

        await alert.executor(payload);

        expect(scheduleNotificationActions).toHaveBeenCalledWith(
          expect.objectContaining({
            signalsCount: 1,
          })
        );
      });
    });
  });

  describe('should catch error', () => {
    it('when bulk indexing failed', async () => {
      (searchAfterAndBulkCreate as jest.Mock).mockResolvedValue({
        success: false,
        searchAfterTimes: [],
        bulkCreateTimes: [],
        lastLookBackDate: null,
        createdSignalsCount: 0,
      });
      await alert.executor(payload);
      expect(logger.error).toHaveBeenCalled();
      expect(logger.error.mock.calls[0][0]).toContain(
        'Bulk Indexing of signals failed. Check logs for further details.'
      );
      expect(ruleStatusService.error).toHaveBeenCalled();
    });

    it('when error was thrown', async () => {
      (searchAfterAndBulkCreate as jest.Mock).mockRejectedValue({});
      await alert.executor(payload);
      expect(logger.error).toHaveBeenCalled();
      expect(logger.error.mock.calls[0][0]).toContain('An error occurred during rule execution');
      expect(ruleStatusService.error).toHaveBeenCalled();
    });

    it('and call ruleStatusService with the default message', async () => {
      (searchAfterAndBulkCreate as jest.Mock).mockRejectedValue({});
      await alert.executor(payload);
      expect(logger.error).toHaveBeenCalled();
      expect(logger.error.mock.calls[0][0]).toContain('An error occurred during rule execution');
      expect(ruleStatusService.error).toHaveBeenCalled();
    });
  });

  describe('createSignals', () => {
    describe('no exceptions', () => {
      // this should be added in here for testing within executor (pronounced egg-zec-u-ter)?
      it('should not invoke "findExceptionItems" if no exception lists exist', async () => {});
      // we could write this test in get filter or SABC?
      it('should not modify rule query', async () => {});
      // this might be covered by a test in search_after_bulk_create.test.ts?
      it('should not invoke "filterEventsWithLists" if no exception lists exist', async () => {});
      // this is probably covered by some test in SABC.
      it('should only conduct one search, assuming MAX_SIGNALS events are found', async () => {});
      // extend this in a test in SABC
      it('should conduct a second search if first search results in less than MAX_SIGNALS', async () => {});
      // extend this in a test in SABC
      it('should return MAX_SIGNALS events to create signals from', async () => {});
    });
    describe('exceptions exist, no large list values', () => {
      // add this test case to the executor
      it('should invoke "findExceptionItems"', async () => {});
      it('should append exceptions to rule query', async () => {});
      it('should not invoke "filterEventsWithLists"', async () => {});
      // testing if we cut out of loops early or not?
      it('should filter through all exception items while number of events remains greater than 0', async () => {});
      // different from the test case for filter with lists.test.. add this test case to SABC
      it('should not filter through all exception items if one of filters out all events', async () => {});
      it('should return MAX_SIGNALS events to create signals from', async () => {});
      it('should return less than MAX_SIGNALS events to create signals from if SOME_CONDITION is met before MAX_SIGNALS reached', async () => {});
    });
    describe('exceptions exist, only large list values', () => {
      it('should invoke "findExceptionItems"', async () => {});
      it('should not modify rule query', async () => {});
      it('should invoke "filterEventsWithLists"', async () => {});
      it('should filter through all exception items while number of events remains greater than 0', async () => {});
      it('should not filter through all exception items if one of filters out all events', async () => {});
      it('should return MAX_SIGNALS events to create signals from', async () => {});
      it('should return less than MAX_SIGNALS events to create signals from if SOME_CONDITION is met before MAX_SIGNALS reached', async () => {});
    });
    describe('exceptions exist, mix', () => {
      it('should return MAX_SIGNALS events to create signals from', async () => {});
      it('should return less than MAX_SIGNALS events to create signals from if SOME_CONDITION is met before MAX_SIGNALS reached', async () => {});
    });
  });

  describe('exception items', () => {
    it('should filter out exceptions given two simple exception items', async () => {
      const ruleAlert = getResult();
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
      expect((searchAfterAndBulkCreate as jest.Mock).mock.calls[0][0].refresh).toEqual('wait_for');
      (searchAfterAndBulkCreate as jest.Mock).mockClear();
    });
  });
});
