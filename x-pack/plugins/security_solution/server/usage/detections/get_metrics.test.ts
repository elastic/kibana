/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionMetrics } from './types';

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '../../../../../../src/core/server/mocks';
import { mlServicesMock } from '../../lib/machine_learning/mocks';
import {
  getMockMlJobSummaryResponse,
  getMockListModulesResponse,
  getMockMlJobDetailsResponse,
  getMockMlJobStatsResponse,
  getMockMlDatafeedStatsResponse,
  getMockRuleSearchResponse,
} from './ml_jobs/get_metrics.mocks';
import {
  getMockRuleAlertsResponse,
  getMockAlertCaseCommentsResponse,
  getEmptySavedObjectResponse,
} from './rules/get_metrics.mocks';
import { getInitialDetectionMetrics } from './get_initial_usage';
import { getDetectionsMetrics } from './get_metrics';
import { getInitialRulesUsage } from './rules/get_initial_usage';

describe('Detections Usage and Metrics', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mlClient: ReturnType<typeof mlServicesMock.createSetupContract>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  describe('getRuleMetrics()', () => {
    beforeEach(() => {
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      mlClient = mlServicesMock.createSetupContract();
      savedObjectsClient = savedObjectsClientMock.create();
    });

    it('returns zeroed counts if calls are empty', async () => {
      const logger = loggingSystemMock.createLogger();
      const result = await getDetectionsMetrics({
        signalsIndex: '',
        esClient,
        savedObjectsClient,
        logger,
        mlClient,
      });
      expect(result).toEqual<DetectionMetrics>(getInitialDetectionMetrics());
    });

    it('returns information with rule, alerts and cases', async () => {
      esClient.search.mockResponseOnce(getMockRuleAlertsResponse(3400));
      savedObjectsClient.find.mockResolvedValueOnce(getMockRuleSearchResponse());
      savedObjectsClient.find.mockResolvedValueOnce(getMockAlertCaseCommentsResponse());
      // Get empty saved object for legacy notification system.
      savedObjectsClient.find.mockResolvedValueOnce(getEmptySavedObjectResponse());
      const logger = loggingSystemMock.createLogger();
      const result = await getDetectionsMetrics({
        signalsIndex: '',
        esClient,
        savedObjectsClient,
        logger,
        mlClient,
      });

      expect(result).toEqual<DetectionMetrics>({
        ...getInitialDetectionMetrics(),
        detection_rules: {
          detection_rule_detail: [
            {
              alert_count_daily: 3400,
              cases_count_total: 1,
              created_on: '2021-03-23T17:15:59.634Z',
              elastic_rule: true,
              enabled: false,
              rule_id: '5370d4cd-2bb3-4d71-abf5-1e1d0ff5a2de',
              rule_name: 'Azure Diagnostic Settings Deletion',
              rule_type: 'query',
              rule_version: 4,
              updated_on: '2021-03-23T17:15:59.634Z',
              has_legacy_notification: false,
              has_notification: false,
            },
          ],
          detection_rule_usage: {
            ...getInitialRulesUsage(),
            query: {
              enabled: 0,
              disabled: 1,
              alerts: 3400,
              cases: 1,
              legacy_notifications_enabled: 0,
              legacy_notifications_disabled: 0,
              notifications_enabled: 0,
              notifications_disabled: 0,
            },
            elastic_total: {
              alerts: 3400,
              cases: 1,
              disabled: 1,
              enabled: 0,
              legacy_notifications_enabled: 0,
              legacy_notifications_disabled: 0,
              notifications_enabled: 0,
              notifications_disabled: 0,
            },
          },
        },
      });
    });

    it('returns information with on non elastic prebuilt rule', async () => {
      esClient.search.mockResponseOnce(getMockRuleAlertsResponse(800));
      savedObjectsClient.find.mockResolvedValueOnce(getMockRuleSearchResponse('not_immutable'));
      savedObjectsClient.find.mockResolvedValueOnce(getMockAlertCaseCommentsResponse());
      // Get empty saved object for legacy notification system.
      savedObjectsClient.find.mockResolvedValueOnce(getEmptySavedObjectResponse());
      const logger = loggingSystemMock.createLogger();
      const result = await getDetectionsMetrics({
        signalsIndex: '',
        esClient,
        savedObjectsClient,
        logger,
        mlClient,
      });

      expect(result).toEqual<DetectionMetrics>({
        ...getInitialDetectionMetrics(),
        detection_rules: {
          detection_rule_detail: [], // *should not* contain custom detection rule details
          detection_rule_usage: {
            ...getInitialRulesUsage(),
            custom_total: {
              alerts: 800,
              cases: 1,
              disabled: 1,
              enabled: 0,
              legacy_notifications_enabled: 0,
              legacy_notifications_disabled: 0,
              notifications_enabled: 0,
              notifications_disabled: 0,
            },
            query: {
              alerts: 800,
              cases: 1,
              disabled: 1,
              enabled: 0,
              legacy_notifications_enabled: 0,
              legacy_notifications_disabled: 0,
              notifications_enabled: 0,
              notifications_disabled: 0,
            },
          },
        },
      });
    });

    it('returns information with rule, no alerts and no cases', async () => {
      esClient.search.mockResponseOnce(getMockRuleAlertsResponse(0));
      savedObjectsClient.find.mockResolvedValueOnce(getMockRuleSearchResponse());
      savedObjectsClient.find.mockResolvedValueOnce(getMockAlertCaseCommentsResponse());
      // Get empty saved object for legacy notification system.
      savedObjectsClient.find.mockResolvedValueOnce(getEmptySavedObjectResponse());

      const logger = loggingSystemMock.createLogger();
      const result = await getDetectionsMetrics({
        signalsIndex: '',
        esClient,
        savedObjectsClient,
        logger,
        mlClient,
      });

      expect(result).toEqual<DetectionMetrics>({
        ...getInitialDetectionMetrics(),
        detection_rules: {
          detection_rule_detail: [
            {
              alert_count_daily: 0,
              cases_count_total: 1,
              created_on: '2021-03-23T17:15:59.634Z',
              elastic_rule: true,
              enabled: false,
              rule_id: '5370d4cd-2bb3-4d71-abf5-1e1d0ff5a2de',
              rule_name: 'Azure Diagnostic Settings Deletion',
              rule_type: 'query',
              rule_version: 4,
              updated_on: '2021-03-23T17:15:59.634Z',
              has_legacy_notification: false,
              has_notification: false,
            },
          ],
          detection_rule_usage: {
            ...getInitialRulesUsage(),
            elastic_total: {
              alerts: 0,
              cases: 1,
              disabled: 1,
              enabled: 0,
              legacy_notifications_enabled: 0,
              legacy_notifications_disabled: 0,
              notifications_enabled: 0,
              notifications_disabled: 0,
            },
            query: {
              alerts: 0,
              cases: 1,
              disabled: 1,
              enabled: 0,
              legacy_notifications_enabled: 0,
              legacy_notifications_disabled: 0,
              notifications_enabled: 0,
              notifications_disabled: 0,
            },
          },
        },
      });
    });
  });

  describe('getDetectionsMetrics()', () => {
    beforeEach(() => {
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      mlClient = mlServicesMock.createSetupContract();
      savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.find.mockResolvedValue(getEmptySavedObjectResponse());
    });

    it('returns an empty array if there is no data', async () => {
      mlClient.anomalyDetectorsProvider.mockReturnValue({
        jobs: null,
        jobStats: null,
      } as unknown as ReturnType<typeof mlClient.anomalyDetectorsProvider>);
      const logger = loggingSystemMock.createLogger();
      const result = await getDetectionsMetrics({
        signalsIndex: '',
        esClient,
        savedObjectsClient,
        logger,
        mlClient,
      });
      expect(result).toEqual<DetectionMetrics>(getInitialDetectionMetrics());
    });

    it('returns an ml job telemetry object from anomaly detectors provider', async () => {
      const logger = loggingSystemMock.createLogger();
      const mockJobSummary = jest.fn().mockResolvedValue(getMockMlJobSummaryResponse());
      const mockListModules = jest.fn().mockResolvedValue(getMockListModulesResponse());
      mlClient.modulesProvider.mockReturnValue({
        listModules: mockListModules,
      } as unknown as ReturnType<typeof mlClient.modulesProvider>);
      mlClient.jobServiceProvider.mockReturnValue({
        jobsSummary: mockJobSummary,
      });
      const mockJobsResponse = jest.fn().mockResolvedValue(getMockMlJobDetailsResponse());
      const mockJobStatsResponse = jest.fn().mockResolvedValue(getMockMlJobStatsResponse());
      const mockDatafeedStatsResponse = jest
        .fn()
        .mockResolvedValue(getMockMlDatafeedStatsResponse());

      mlClient.anomalyDetectorsProvider.mockReturnValue({
        jobs: mockJobsResponse,
        jobStats: mockJobStatsResponse,
        datafeedStats: mockDatafeedStatsResponse,
      } as unknown as ReturnType<typeof mlClient.anomalyDetectorsProvider>);

      const result = await getDetectionsMetrics({
        signalsIndex: '',
        esClient,
        savedObjectsClient,
        logger,
        mlClient,
      });

      expect(result).toEqual(
        expect.objectContaining({
          ml_jobs: {
            ml_job_usage: {
              custom: {
                disabled: 1,
                enabled: 1,
              },
              elastic: {
                disabled: 1,
                enabled: 1,
              },
            },
            ml_job_metrics: [
              {
                job_id: 'high_distinct_count_error_message',
                create_time: 1603838214983,
                finished_time: 1611739871669,
                state: 'closed',
                data_counts: {
                  bucket_count: 8612,
                  empty_bucket_count: 8590,
                  input_bytes: 45957,
                  input_record_count: 162,
                  last_data_time: 1610470367123,
                  processed_record_count: 162,
                },
                model_size_stats: {
                  bucket_allocation_failures_count: 0,
                  memory_status: 'ok',
                  model_bytes: 72574,
                  model_bytes_exceeded: 0,
                  model_bytes_memory_limit: 16777216,
                  peak_model_bytes: 78682,
                },
                timing_stats: {
                  average_bucket_processing_time_ms: 0.4900837644740133,
                  bucket_count: 16236,
                  exponential_average_bucket_processing_time_ms: 0.23614068552903306,
                  exponential_average_bucket_processing_time_per_hour_ms: 1.5551298175461634,
                  maximum_bucket_processing_time_ms: 392,
                  minimum_bucket_processing_time_ms: 0,
                  total_bucket_processing_time_ms: 7957.00000000008,
                },
                datafeed: {
                  datafeed_id: 'datafeed-high_distinct_count_error_message',
                  state: 'stopped',
                  timing_stats: {
                    bucket_count: 8612,
                    exponential_average_search_time_per_hour_ms: 86145.39799630083,
                    search_count: 7202,
                    total_search_time_ms: 3107147,
                  },
                },
              },
            ],
          },
        })
      );
    });
  });
});
