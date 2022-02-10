/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import { keyBy } from 'lodash';
import { MlClient } from '../../lib/ml_client';

export type MemoryOverviewService = ReturnType<typeof memoryOverviewServiceProvider>;

export interface MlJobMemoryOverview {
  job_id: string;
  node_id: string;
  model_size: number;
}

const MB = Math.pow(2, 20);

const AD_PROCESS_MEMORY_OVERHEAD = 10 * MB;
const DFA_PROCESS_MEMORY_OVERHEAD = 5 * MB;
export const NATIVE_EXECUTABLE_CODE_OVERHEAD = 30 * MB;

/**
 * Provides a service for memory overview across ML.
 * @param mlClient
 */
export function memoryOverviewServiceProvider(mlClient: MlClient) {
  return {
    /**
     * Retrieves memory consumed my started DFA jobs.
     */
    async getDFAMemoryOverview(): Promise<MlJobMemoryOverview[]> {
      const {
        body: { data_frame_analytics: dfaStats },
      } = await mlClient.getDataFrameAnalyticsStats();

      const dfaMemoryReport = dfaStats
        .filter((dfa) => dfa.state === 'started')
        .map((dfa) => {
          return {
            node_id: dfa.node?.id,
            job_id: dfa.id,
          };
        }) as MlJobMemoryOverview[];

      if (dfaMemoryReport.length === 0) {
        return [];
      }

      const dfaMemoryKeyByJobId = keyBy(dfaMemoryReport, 'job_id');

      const {
        body: { data_frame_analytics: startedDfaJobs },
      } = await mlClient.getDataFrameAnalytics({
        id: dfaMemoryReport.map((v) => v.job_id).join(','),
      });

      startedDfaJobs.forEach((dfa) => {
        dfaMemoryKeyByJobId[dfa.id].model_size =
          numeral(
            dfa.model_memory_limit?.toUpperCase()
            // @ts-ignore
          ).value() + DFA_PROCESS_MEMORY_OVERHEAD;
      });

      return dfaMemoryReport;
    },
    /**
     * Retrieves memory consumed by opened Anomaly Detection jobs.
     */
    async getAnomalyDetectionMemoryOverview(): Promise<MlJobMemoryOverview[]> {
      const {
        body: { jobs: jobsStats },
      } = await mlClient.getJobStats();

      return jobsStats
        .filter((v) => v.state === 'opened')
        .map((jobStats) => {
          return {
            node_id: jobStats.node.id,
            // @ts-expect-error model_bytes can be string | number, cannot sum it with AD_PROCESS_MEMORY_OVERHEAD
            model_size: jobStats.model_size_stats.model_bytes + AD_PROCESS_MEMORY_OVERHEAD,
            job_id: jobStats.job_id,
          };
        });
    },
  };
}
