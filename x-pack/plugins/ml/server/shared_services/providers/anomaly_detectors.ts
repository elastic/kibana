/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest } from '../../../../../../src/core/server/http/router/request';
import type { SavedObjectsClientContract } from '../../../../../../src/core/server/saved_objects/types';
import type { Datafeed } from '../../../common/types/anomaly_detection_jobs/datafeed';
import type { DatafeedStats } from '../../../common/types/anomaly_detection_jobs/datafeed_stats';
import type { Job } from '../../../common/types/anomaly_detection_jobs/job';
import type { JobStats } from '../../../common/types/anomaly_detection_jobs/job_stats';
import type { GetGuards } from '../shared_services';

export interface AnomalyDetectorsProvider {
  anomalyDetectorsProvider(
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ): {
    jobs(jobId?: string): Promise<{ count: number; jobs: Job[] }>;
    jobStats(jobId?: string): Promise<{ count: number; jobs: JobStats[] }>;
    datafeeds(datafeedId?: string): Promise<{ count: number; datafeeds: Datafeed[] }>;
    datafeedStats(datafeedId?: string): Promise<{ count: number; datafeeds: DatafeedStats[] }>;
  };
}

export function getAnomalyDetectorsProvider(getGuards: GetGuards): AnomalyDetectorsProvider {
  return {
    anomalyDetectorsProvider(
      request: KibanaRequest,
      savedObjectsClient: SavedObjectsClientContract
    ) {
      return {
        async jobs(jobId?: string) {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ mlClient }) => {
              const { body } = await mlClient.getJobs<{
                count: number;
                jobs: Job[];
              }>(jobId !== undefined ? { job_id: jobId } : undefined);
              return body;
            });
        },
        async jobStats(jobId?: string) {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ mlClient }) => {
              const { body } = await mlClient.getJobStats<{
                count: number;
                jobs: JobStats[];
              }>(jobId !== undefined ? { job_id: jobId } : undefined);
              return body;
            });
        },
        async datafeeds(datafeedId?: string) {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetDatafeeds'])
            .ok(async ({ mlClient }) => {
              const { body } = await mlClient.getDatafeeds<{
                count: number;
                datafeeds: Datafeed[];
              }>(datafeedId !== undefined ? { datafeed_id: datafeedId } : undefined);
              return body;
            });
        },
        async datafeedStats(datafeedId?: string) {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetDatafeeds'])
            .ok(async ({ mlClient }) => {
              const { body } = await mlClient.getDatafeedStats<{
                count: number;
                datafeeds: DatafeedStats[];
              }>(datafeedId !== undefined ? { datafeed_id: datafeedId } : undefined);
              return body;
            });
        },
      };
    },
  };
}
