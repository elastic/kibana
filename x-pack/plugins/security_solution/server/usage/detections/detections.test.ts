/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '../../../../../../src/core/server';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '../../../../../../src/core/server/mocks';
import { mlServicesMock } from '../../lib/machine_learning/mocks';
import { fetchDetectionsMetrics } from './index';
import {
  getMockJobSummaryResponse,
  getMockListModulesResponse,
  getMockMlJobDetailsResponse,
  getMockMlJobStatsResponse,
  getMockMlDatafeedStatsResponse,
  getMockRuleSearchResponse,
  getMockRuleAlertsResponse,
  getMockAlertCasesResponse,
} from './detections.mocks';
import { getInitialDetectionMetrics, initialDetectionRulesUsage } from './detection_rule_helpers';
import { DetectionMetrics } from './types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

describe('Detections Usage and Metrics', () => {
  let esClientMock: jest.Mocked<ElasticsearchClient>;
  let mlMock: ReturnType<typeof mlServicesMock.createSetupContract>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  describe('getDetectionRuleMetrics()', () => {
    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
      mlMock = mlServicesMock.createSetupContract();
      savedObjectsClient = savedObjectsClientMock.create();
    });

    it('returns zeroed counts if calls are empty', async () => {
      const result = await fetchDetectionsMetrics('', '', esClientMock, savedObjectsClient, mlMock);
      expect(result).toEqual<DetectionMetrics>(getInitialDetectionMetrics());
    });

    it('returns information with rule, alerts and cases', async () => {
      esClientMock.search
        .mockResolvedValueOnce(
          elasticsearchClientMock.createApiResponse({ body: getMockRuleSearchResponse() })
        )
        .mockResolvedValue(
          elasticsearchClientMock.createApiResponse({ body: getMockRuleAlertsResponse(3400) })
        );
      savedObjectsClient.find.mockResolvedValue(getMockAlertCasesResponse());
      const result = await fetchDetectionsMetrics('', '', esClientMock, savedObjectsClient, mlMock);

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
            },
          ],
          detection_rule_usage: {
            ...initialDetectionRulesUsage,
            query: {
              enabled: 0,
              disabled: 1,
              alerts: 3400,
              cases: 1,
            },
            elastic_total: {
              alerts: 3400,
              cases: 1,
              disabled: 1,
              enabled: 0,
            },
            legacy_notifications: {
              total: 4,
            },
          },
        },
      });
    });

    it('returns information with on non elastic prebuilt rule', async () => {
      esClientMock.search
        .mockResolvedValueOnce(
          elasticsearchClientMock.createApiResponse({
            body: getMockRuleSearchResponse('not_immutable'),
          })
        )
        .mockResolvedValue(
          elasticsearchClientMock.createApiResponse({ body: getMockRuleAlertsResponse(800) })
        );
      savedObjectsClient.find.mockResolvedValue(getMockAlertCasesResponse());
      const result = await fetchDetectionsMetrics('', '', esClientMock, savedObjectsClient, mlMock);

      expect(result).toEqual<DetectionMetrics>({
        ...getInitialDetectionMetrics(),
        detection_rules: {
          detection_rule_detail: [], // *should not* contain custom detection rule details
          detection_rule_usage: {
            ...initialDetectionRulesUsage,
            custom_total: {
              alerts: 800,
              cases: 1,
              disabled: 1,
              enabled: 0,
            },
            query: {
              alerts: 800,
              cases: 1,
              disabled: 1,
              enabled: 0,
            },
            legacy_notifications: {
              total: 4,
            },
          },
        },
      });
    });

    it('returns information with rule, no alerts and no cases', async () => {
      esClientMock.search
        .mockResolvedValueOnce(
          elasticsearchClientMock.createApiResponse({ body: getMockRuleSearchResponse() })
        )
        .mockResolvedValue(
          elasticsearchClientMock.createApiResponse({ body: getMockRuleAlertsResponse(0) })
        );
      savedObjectsClient.find.mockResolvedValue(getMockAlertCasesResponse());
      const result = await fetchDetectionsMetrics('', '', esClientMock, savedObjectsClient, mlMock);

      expect(result).toEqual({
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
            },
          ],
          detection_rule_usage: {
            ...initialDetectionRulesUsage,
            elastic_total: {
              alerts: 0,
              cases: 1,
              disabled: 1,
              enabled: 0,
            },
            query: {
              alerts: 0,
              cases: 1,
              disabled: 1,
              enabled: 0,
            },
            legacy_notifications: {
              total: 4,
            },
          },
        },
      });
    });
  });

  describe('fetchDetectionsMetrics()', () => {
    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
      mlMock = mlServicesMock.createSetupContract();
      savedObjectsClient = savedObjectsClientMock.create();
    });

    it('returns an empty array if there is no data', async () => {
      mlMock.anomalyDetectorsProvider.mockReturnValue({
        jobs: null,
        jobStats: null,
      } as unknown as ReturnType<typeof mlMock.anomalyDetectorsProvider>);
      const result = await fetchDetectionsMetrics('', '', esClientMock, savedObjectsClient, mlMock);
      expect(result).toEqual<DetectionMetrics>(getInitialDetectionMetrics());
    });

    it('returns an ml job telemetry object from anomaly detectors provider', async () => {
      const mockJobSummary = jest.fn().mockResolvedValue(getMockJobSummaryResponse());
      const mockListModules = jest.fn().mockResolvedValue(getMockListModulesResponse());
      mlMock.modulesProvider.mockReturnValue({
        listModules: mockListModules,
      } as unknown as ReturnType<typeof mlMock.modulesProvider>);
      mlMock.jobServiceProvider.mockReturnValue({
        jobsSummary: mockJobSummary,
      });
      const mockJobsResponse = jest.fn().mockResolvedValue(getMockMlJobDetailsResponse());
      const mockJobStatsResponse = jest.fn().mockResolvedValue(getMockMlJobStatsResponse());
      const mockDatafeedStatsResponse = jest
        .fn()
        .mockResolvedValue(getMockMlDatafeedStatsResponse());

      mlMock.anomalyDetectorsProvider.mockReturnValue({
        jobs: mockJobsResponse,
        jobStats: mockJobStatsResponse,
        datafeedStats: mockDatafeedStatsResponse,
      } as unknown as ReturnType<typeof mlMock.anomalyDetectorsProvider>);

      const result = await fetchDetectionsMetrics('', '', esClientMock, savedObjectsClient, mlMock);

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
