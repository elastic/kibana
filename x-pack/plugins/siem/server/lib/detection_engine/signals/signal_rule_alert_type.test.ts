/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { loggingServiceMock } from 'src/core/server/mocks';
import { getResult, getMlResult } from '../routes/__mocks__/request_responses';
import { signalRulesAlertType } from './signal_rule_alert_type';
import { alertsMock, AlertServicesMock } from '../../../../../alerting/server/mocks';
import { ruleStatusServiceFactory } from './rule_status_service';
import { getGapBetweenRuns } from './utils';
import { RuleExecutorOptions } from './types';
import { searchAfterAndBulkCreate } from './search_after_bulk_create';
import { scheduleNotificationActions } from '../notifications/schedule_notification_actions';
import { RuleAlertType } from '../rules/types';
import { findMlSignals } from './find_ml_signals';
import { bulkCreateMlSignals } from './bulk_create_ml_signals';

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
    scrollSize: 10,
    scrollLock: '0',
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
  let logger: ReturnType<typeof loggingServiceMock.createLogger>;
  let alertServices: AlertServicesMock;
  let ruleStatusService: Record<string, jest.Mock>;

  beforeEach(() => {
    alertServices = alertsMock.createAlertServices();
    logger = loggingServiceMock.createLogger();
    ruleStatusService = {
      success: jest.fn(),
      find: jest.fn(),
      goingToRun: jest.fn(),
      error: jest.fn(),
    };
    (ruleStatusServiceFactory as jest.Mock).mockReturnValue(ruleStatusService);
    (getGapBetweenRuns as jest.Mock).mockReturnValue(moment.duration(0));
    (searchAfterAndBulkCreate as jest.Mock).mockClear();
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

    payload = getPayload(ruleAlert, alertServices);

    alert = signalRulesAlertType({
      logger,
      version,
      ml: mlMock,
      lists: undefined,
    });
  });

  describe('executor', () => {
    it('should warn about the gap between runs', async () => {
      (getGapBetweenRuns as jest.Mock).mockReturnValue(moment.duration(1000));
      await alert.executor(payload);
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.warn.mock.calls[0][0]).toContain(
        'a few seconds (1000ms) has passed since last rule execution, and signals may have been missed.'
      );
      expect(ruleStatusService.error).toHaveBeenCalled();
      expect(ruleStatusService.error.mock.calls[0][0]).toContain(
        'a few seconds (1000ms) has passed since last rule execution, and signals may have been missed.'
      );
      expect(ruleStatusService.error.mock.calls[0][1]).toEqual({
        gap: 'a few seconds',
      });
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
        payload = getPayload(ruleAlert, alertServices);
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
        payload = getPayload(ruleAlert, alertServices);
        await alert.executor(payload);
        expect(logger.error).toHaveBeenCalled();
        expect(logger.error.mock.calls[0][0]).toContain(
          'Machine learning rule is missing job id and/or anomaly threshold'
        );
      });

      it('should throw an error if Machine learning job summary was null', async () => {
        const ruleAlert = getMlResult();
        payload = getPayload(ruleAlert, alertServices);
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
        payload = getPayload(ruleAlert, alertServices);
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
        payload = getPayload(ruleAlert, alertServices);
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
        payload = getPayload(ruleAlert, alertServices);
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
        payload = getPayload(ruleAlert, alertServices);
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
      (searchAfterAndBulkCreate as jest.Mock).mockResolvedValue({});
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
});
