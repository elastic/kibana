/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { MlAnomalyDetectors, MlSystem } from '../../types';
import { NoLogAnalysisMlJobError } from './errors';

import {
  CompositeDatasetKey,
  createLogEntryDatasetsQuery,
  LogEntryDatasetBucket,
  logEntryDatasetsResponseRT,
} from './queries/log_entry_data_sets';
import { decodeOrThrow } from '../../../common/runtime_types';
import { NoLogAnalysisResultsIndexError } from './errors';
import { startTracingSpan, TracingSpan } from '../../../common/performance_tracing';

export async function fetchMlJob(mlAnomalyDetectors: MlAnomalyDetectors, jobId: string) {
  const finalizeMlGetJobSpan = startTracingSpan('Fetch ml job from ES');
  const {
    jobs: [mlJob],
  } = await mlAnomalyDetectors.jobs(jobId);

  const mlGetJobSpan = finalizeMlGetJobSpan();

  if (mlJob == null) {
    throw new NoLogAnalysisMlJobError(`Failed to find ml job ${jobId}.`);
  }

  return {
    mlJob,
    timing: {
      spans: [mlGetJobSpan],
    },
  };
}

const COMPOSITE_AGGREGATION_BATCH_SIZE = 1000;

// Finds datasets related to ML job ids
export async function getLogEntryDatasets(
  mlSystem: MlSystem,
  startTime: number,
  endTime: number,
  jobIds: string[]
) {
  const finalizeLogEntryDatasetsSpan = startTracingSpan('get data sets');

  let logEntryDatasetBuckets: LogEntryDatasetBucket[] = [];
  let afterLatestBatchKey: CompositeDatasetKey | undefined;
  let esSearchSpans: TracingSpan[] = [];

  while (true) {
    const finalizeEsSearchSpan = startTracingSpan('fetch log entry dataset batch from ES');

    const logEntryDatasetsResponse = decodeOrThrow(logEntryDatasetsResponseRT)(
      await mlSystem.mlAnomalySearch(
        createLogEntryDatasetsQuery(
          jobIds,
          startTime,
          endTime,
          COMPOSITE_AGGREGATION_BATCH_SIZE,
          afterLatestBatchKey
        )
      )
    );

    if (logEntryDatasetsResponse._shards.total === 0) {
      throw new NoLogAnalysisResultsIndexError(
        `Failed to find ml indices for jobs: ${jobIds.join(', ')}.`
      );
    }

    const {
      after_key: afterKey,
      buckets: latestBatchBuckets,
    } = logEntryDatasetsResponse.aggregations.dataset_buckets;

    logEntryDatasetBuckets = [...logEntryDatasetBuckets, ...latestBatchBuckets];
    afterLatestBatchKey = afterKey;
    esSearchSpans = [...esSearchSpans, finalizeEsSearchSpan()];

    if (latestBatchBuckets.length < COMPOSITE_AGGREGATION_BATCH_SIZE) {
      break;
    }
  }

  const logEntryDatasetsSpan = finalizeLogEntryDatasetsSpan();

  return {
    data: logEntryDatasetBuckets.map((logEntryDatasetBucket) => logEntryDatasetBucket.key.dataset),
    timing: {
      spans: [logEntryDatasetsSpan, ...esSearchSpans],
    },
  };
}
