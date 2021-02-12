/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '../../../../../../src/core/server';
import { elasticsearchServiceMock } from '../../../../../../src/core/server/mocks';
import { mlServicesMock } from '../../lib/machine_learning/mocks';
import {
  getMockJobSummaryResponse,
  getMockListModulesResponse,
  getMockRulesResponse,
  getMockMlJobDetailsResponse,
  getMockMlJobStatsResponse,
  getMockMlDatafeedStatsResponse,
} from './detections.mocks';
import { fetchDetectionsUsage, fetchDetectionsMetrics } from './index';

describe('Detections Usage and Metrics', () => {
  let esClientMock: jest.Mocked<ElasticsearchClient>;
  let savedObjectsClientMock: jest.Mocked<SavedObjectsClientContract>;
  let mlMock: ReturnType<typeof mlServicesMock.create>;

  describe('fetchDetectionsUsage()', () => {
    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
      mlMock = mlServicesMock.create();
    });

    it('returns zeroed counts if both calls are empty', async () => {
      const result = await fetchDetectionsUsage('', esClientMock, mlMock, savedObjectsClientMock);

      expect(result).toEqual({
        detection_rules: {
          custom: {
            enabled: 0,
            disabled: 0,
          },
          elastic: {
            enabled: 0,
            disabled: 0,
          },
        },
        ml_jobs: {
          custom: {
            enabled: 0,
            disabled: 0,
          },
          elastic: {
            enabled: 0,
            disabled: 0,
          },
        },
      });
    });

    it('tallies rules data given rules results', async () => {
      (esClientMock.search as jest.Mock).mockResolvedValue({ body: getMockRulesResponse() });

      const result = await fetchDetectionsUsage('', esClientMock, mlMock, savedObjectsClientMock);

      expect(result).toEqual(
        expect.objectContaining({
          detection_rules: {
            custom: {
              enabled: 1,
              disabled: 1,
            },
            elastic: {
              enabled: 2,
              disabled: 3,
            },
          },
        })
      );
    });

    it('tallies jobs data given jobs results', async () => {
      const mockJobSummary = jest.fn().mockResolvedValue(getMockJobSummaryResponse());
      const mockListModules = jest.fn().mockResolvedValue(getMockListModulesResponse());
      mlMock.modulesProvider.mockReturnValue(({
        listModules: mockListModules,
      } as unknown) as ReturnType<typeof mlMock.modulesProvider>);
      mlMock.jobServiceProvider.mockReturnValue({
        jobsSummary: mockJobSummary,
      });

      const result = await fetchDetectionsUsage('', esClientMock, mlMock, savedObjectsClientMock);

      expect(result).toEqual(
        expect.objectContaining({
          ml_jobs: {
            custom: {
              enabled: 1,
              disabled: 1,
            },
            elastic: {
              enabled: 1,
              disabled: 1,
            },
          },
        })
      );
    });
  });

  describe('fetchDetectionsMetrics()', () => {
    beforeEach(() => {
      mlMock = mlServicesMock.create();
    });

    it('returns an empty array if there is no data', async () => {
      mlMock.anomalyDetectorsProvider.mockReturnValue(({
        jobs: null,
        jobStats: null,
      } as unknown) as ReturnType<typeof mlMock.anomalyDetectorsProvider>);
      const result = await fetchDetectionsMetrics(mlMock, savedObjectsClientMock);

      expect(result).toEqual(
        expect.objectContaining({
          ml_jobs: [],
        })
      );
    });

    it('returns an ml job telemetry object from anomaly detectors provider', async () => {
      const mockJobsResponse = jest.fn().mockResolvedValue(getMockMlJobDetailsResponse());
      const mockJobStatsResponse = jest.fn().mockResolvedValue(getMockMlJobStatsResponse());
      const mockDatafeedStatsResponse = jest
        .fn()
        .mockResolvedValue(getMockMlDatafeedStatsResponse());

      mlMock.anomalyDetectorsProvider.mockReturnValue(({
        jobs: mockJobsResponse,
        jobStats: mockJobStatsResponse,
        datafeedStats: mockDatafeedStatsResponse,
      } as unknown) as ReturnType<typeof mlMock.anomalyDetectorsProvider>);

      const result = await fetchDetectionsMetrics(mlMock, savedObjectsClientMock);

      expect(result).toEqual(
        expect.objectContaining({
          ml_jobs: [
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
                  average_search_time_per_bucket_ms: 360.7927310729215,
                  bucket_count: 8612,
                  exponential_average_search_time_per_hour_ms: 86145.39799630083,
                  search_count: 7202,
                  total_search_time_ms: 3107147,
                },
              },
            },
          ],
        })
      );
    });
  });
});
