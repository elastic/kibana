/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeOrThrow } from '@kbn/io-ts-utils';
import { IdFormat } from '../../../common/http_api/latest';
import {
  logRateModelPlotResponseRT,
  createLogEntryRateQuery,
  LogRateModelPlotBucket,
  CompositeTimestampPartitionKey,
} from './queries';
import { getJobId, logEntryRateJobType } from '../../../common/log_analysis';
import type { MlSystem } from '../../types';

const COMPOSITE_AGGREGATION_BATCH_SIZE = 1000;

export async function getLogEntryRateBuckets(
  context: {
    infra: {
      mlSystem: MlSystem;
      spaceId: string;
    };
  },
  logViewId: string,
  idFormat: IdFormat,
  startTime: number,
  endTime: number,
  bucketDuration: number,
  datasets?: string[]
) {
  const logRateJobId = getJobId(context.infra.spaceId, logViewId, idFormat, logEntryRateJobType);
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
      ),
      [logRateJobId]
    );

    const { after_key: afterKey, buckets: latestBatchBuckets = [] } =
      decodeOrThrow(logRateModelPlotResponseRT)(mlModelPlotResponse).aggregations
        ?.timestamp_partition_buckets ?? {};

    mlModelPlotBuckets = [...mlModelPlotBuckets, ...latestBatchBuckets];
    afterLatestBatchKey = afterKey;

    if (afterKey == null || latestBatchBuckets.length < COMPOSITE_AGGREGATION_BATCH_SIZE) {
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
