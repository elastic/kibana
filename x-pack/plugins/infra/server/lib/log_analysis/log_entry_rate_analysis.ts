/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { throwErrors, createPlainError } from '../../../common/runtime_types';
import {
  logRateModelPlotResponseRT,
  createLogEntryRateQuery,
  LogRateModelPlotBucket,
  CompositeTimestampPartitionKey,
} from './queries';
import { getJobId } from '../../../common/log_analysis';
import { NoLogAnalysisResultsIndexError } from './errors';
import type { MlSystem } from '../../types';

const COMPOSITE_AGGREGATION_BATCH_SIZE = 1000;

export async function getLogEntryRateBuckets(
  context: {
    infra: {
      mlSystem: MlSystem;
      spaceId: string;
    };
  },
  sourceId: string,
  startTime: number,
  endTime: number,
  bucketDuration: number,
  datasets?: string[]
) {
  const logRateJobId = getJobId(context.infra.spaceId, sourceId, 'log-entry-rate');
  let mlModelPlotBuckets: LogRateModelPlotBucket[] = [];
  let afterLatestBatchKey: CompositeTimestampPartitionKey | undefined;

  while (true) {
    const mlModelPlotResponse = await context.infra.mlSystem.mlAnomalySearch(
      createLogEntryRateQuery(
        logRateJobId,
        startTime,
        endTime,
        bucketDuration,
        COMPOSITE_AGGREGATION_BATCH_SIZE,
        afterLatestBatchKey,
        datasets
      )
    );

    if (mlModelPlotResponse._shards.total === 0) {
      throw new NoLogAnalysisResultsIndexError(
        `Failed to query ml result index for job ${logRateJobId}.`
      );
    }

    const { after_key: afterKey, buckets: latestBatchBuckets } = pipe(
      logRateModelPlotResponseRT.decode(mlModelPlotResponse),
      map((response) => response.aggregations.timestamp_partition_buckets),
      fold(throwErrors(createPlainError), identity)
    );

    mlModelPlotBuckets = [...mlModelPlotBuckets, ...latestBatchBuckets];
    afterLatestBatchKey = afterKey;

    if (latestBatchBuckets.length < COMPOSITE_AGGREGATION_BATCH_SIZE) {
      break;
    }
  }

  return mlModelPlotBuckets.reduce<
    Array<{
      partitions: Array<{
        analysisBucketCount: number;
        anomalies: Array<{
          id: string;
          actualLogEntryRate: number;
          anomalyScore: number;
          duration: number;
          startTime: number;
          typicalLogEntryRate: number;
        }>;
        averageActualLogEntryRate: number;
        maximumAnomalyScore: number;
        numberOfLogEntries: number;
        partitionId: string;
      }>;
      startTime: number;
    }>
  >((histogramBuckets, timestampPartitionBucket) => {
    const previousHistogramBucket = histogramBuckets[histogramBuckets.length - 1];
    const partition = {
      analysisBucketCount: timestampPartitionBucket.filter_model_plot.doc_count,
      anomalies: timestampPartitionBucket.filter_records.top_hits_record.hits.hits.map(
        ({ _id, _source: record }) => ({
          id: _id,
          actualLogEntryRate: record.actual[0],
          anomalyScore: record.record_score,
          duration: record.bucket_span * 1000,
          startTime: record.timestamp,
          typicalLogEntryRate: record.typical[0],
        })
      ),
      averageActualLogEntryRate:
        timestampPartitionBucket.filter_model_plot.average_actual.value || 0,
      maximumAnomalyScore: timestampPartitionBucket.filter_records.maximum_record_score.value || 0,
      numberOfLogEntries: timestampPartitionBucket.filter_model_plot.sum_actual.value || 0,
      partitionId: timestampPartitionBucket.key.partition,
    };
    if (
      previousHistogramBucket &&
      previousHistogramBucket.startTime === timestampPartitionBucket.key.timestamp
    ) {
      return [
        ...histogramBuckets.slice(0, -1),
        {
          ...previousHistogramBucket,
          partitions: [...previousHistogramBucket.partitions, partition],
        },
      ];
    } else {
      return [
        ...histogramBuckets,
        {
          partitions: [partition],
          startTime: timestampPartitionBucket.key.timestamp,
        },
      ];
    }
  }, []);
}
