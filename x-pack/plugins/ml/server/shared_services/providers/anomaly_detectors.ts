/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { GetGuards } from '../shared_services';
import type {
  Job,
  JobStats,
  Datafeed,
  DatafeedStats,
} from '../../../common/types/anomaly_detection_jobs';

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
      const guards = getGuards(request, savedObjectsClient);
      return {
        async jobs(jobId?: string) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ mlClient }) => {
              const body = await mlClient.getJobs(
                jobId !== undefined ? { job_id: jobId } : undefined
              );
              return body;
            });
        },
        async jobStats(jobId?: string) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(async ({ mlClient }) => {
              const body = await mlClient.getJobStats(
                jobId !== undefined ? { job_id: jobId } : undefined
              );
              return body;
            });
        },
        async datafeeds(datafeedId?: string) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canGetDatafeeds'])
            .ok(async ({ mlClient }) => {
              const body = await mlClient.getDatafeeds(
                datafeedId !== undefined ? { datafeed_id: datafeedId } : undefined
              );
              return body;
            });
        },
        async datafeedStats(datafeedId?: string) {
          return await guards
            .isFullLicense()
            .hasMlCapabilities(['canGetDatafeeds'])
            .ok(async ({ mlClient }) => {
              const body = await mlClient.getDatafeedStats(
                datafeedId !== undefined ? { datafeed_id: datafeedId } : undefined
              );
              return body;
            });
        },
      };
    },
  };
}
