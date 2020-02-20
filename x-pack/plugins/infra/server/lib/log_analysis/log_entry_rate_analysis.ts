/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { RequestHandlerContext, KibanaRequest } from 'src/core/server';
import { getJobId } from '../../../common/log_analysis';
import { throwErrors, createPlainError } from '../../../common/runtime_types';
import { KibanaFramework } from '../adapters/framework/kibana_framework_adapter';
import { NoLogAnalysisResultsIndexError } from './errors';
import {
  logRateModelPlotResponseRT,
  createLogEntryRateQuery,
  LogRateModelPlotBucket,
  CompositeTimestampPartitionKey,
} from './queries';

const COMPOSITE_AGGREGATION_BATCH_SIZE = 1000;

export class LogEntryRateAnalysis {
  constructor(
    private readonly libs: {
      framework: KibanaFramework;
    }
  ) {}

  public getJobIds(request: KibanaRequest, sourceId: string) {
    return {
      logEntryRate: getJobId(this.libs.framework.getSpaceId(request), sourceId, 'log-entry-rate'),
    };
  }

  public async getLogEntryRateBuckets(
    requestContext: RequestHandlerContext,
    request: KibanaRequest,
    sourceId: string,
    startTime: number,
    endTime: number,
    bucketDuration: number
  ) {
    const logRateJobId = this.getJobIds(request, sourceId).logEntryRate;
    let mlModelPlotBuckets: LogRateModelPlotBucket[] = [];
    let afterLatestBatchKey: CompositeTimestampPartitionKey | undefined;

    while (true) {
      const mlModelPlotResponse = await this.libs.framework.callWithRequest(
        requestContext,
        'search',
        createLogEntryRateQuery(
          logRateJobId,
          startTime,
          endTime,
          bucketDuration,
          COMPOSITE_AGGREGATION_BATCH_SIZE,
          afterLatestBatchKey
        )
      );

      if (mlModelPlotResponse._shards.total === 0) {
        throw new NoLogAnalysisResultsIndexError(
          `Failed to find ml result index for job ${logRateJobId}.`
        );
      }

      const { after_key: afterKey, buckets: latestBatchBuckets } = pipe(
        logRateModelPlotResponseRT.decode(mlModelPlotResponse),
        map(response => response.aggregations.timestamp_partition_buckets),
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
          ({ _source: record }) => ({
            actualLogEntryRate: record.actual[0],
            anomalyScore: record.record_score,
            duration: record.bucket_span * 1000,
            startTime: record.timestamp,
            typicalLogEntryRate: record.typical[0],
          })
        ),
        averageActualLogEntryRate:
          timestampPartitionBucket.filter_model_plot.average_actual.value || 0,
        maximumAnomalyScore:
          timestampPartitionBucket.filter_records.maximum_record_score.value || 0,
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
}
