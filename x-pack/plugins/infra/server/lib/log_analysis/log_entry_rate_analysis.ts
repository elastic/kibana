/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { RequestHandlerContext } from 'src/core/server';
import { throwErrors, createPlainError } from '../../../common/runtime_types';
import {
  logRateModelPlotResponseRT,
  createLogEntryRateQuery,
  LogRateModelPlotBucket,
  CompositeTimestampPartitionKey,
} from './queries';
import { startTracingSpan } from '../../../common/performance_tracing';
import { decodeOrThrow } from '../../../common/runtime_types';
import { getJobId, jobCustomSettingsRT } from '../../../common/log_analysis';
import {
  createLogEntryRateExamplesQuery,
  logEntryRateExamplesResponseRT,
} from './queries/log_entry_rate_examples';
import {
  InsufficientLogAnalysisMlJobConfigurationError,
  NoLogAnalysisMlJobError,
  NoLogAnalysisResultsIndexError,
} from './errors';
import { InfraSource } from '../sources';
import type { MlSystem } from '../../types';
import { InfraRequestHandlerContext } from '../../types';
import { KibanaFramework } from '../adapters/framework/kibana_framework_adapter';

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
  bucketDuration: number
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
        afterLatestBatchKey
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

export async function getLogEntryRateExamples(
  context: RequestHandlerContext & { infra: Required<InfraRequestHandlerContext> },
  sourceId: string,
  startTime: number,
  endTime: number,
  dataset: string,
  exampleCount: number,
  sourceConfiguration: InfraSource,
  callWithRequest: KibanaFramework['callWithRequest']
) {
  const finalizeLogEntryRateExamplesSpan = startTracingSpan(
    'get log entry rate example log entries'
  );

  const jobId = getJobId(context.infra.spaceId, sourceId, 'log-entry-rate');

  const {
    mlJob,
    timing: { spans: fetchMlJobSpans },
  } = await fetchMlJob(context, jobId);

  const customSettings = decodeOrThrow(jobCustomSettingsRT)(mlJob.custom_settings);
  const indices = customSettings?.logs_source_config?.indexPattern;
  const timestampField = customSettings?.logs_source_config?.timestampField;
  const tiebreakerField = sourceConfiguration.configuration.fields.tiebreaker;

  if (indices == null || timestampField == null) {
    throw new InsufficientLogAnalysisMlJobConfigurationError(
      `Failed to find index configuration for ml job ${jobId}`
    );
  }

  const {
    examples,
    timing: { spans: fetchLogEntryRateExamplesSpans },
  } = await fetchLogEntryRateExamples(
    context,
    indices,
    timestampField,
    tiebreakerField,
    startTime,
    endTime,
    dataset,
    exampleCount,
    callWithRequest
  );

  const logEntryRateExamplesSpan = finalizeLogEntryRateExamplesSpan();

  return {
    data: examples,
    timing: {
      spans: [logEntryRateExamplesSpan, ...fetchMlJobSpans, ...fetchLogEntryRateExamplesSpans],
    },
  };
}

export async function fetchLogEntryRateExamples(
  context: RequestHandlerContext & { infra: Required<InfraRequestHandlerContext> },
  indices: string,
  timestampField: string,
  tiebreakerField: string,
  startTime: number,
  endTime: number,
  dataset: string,
  exampleCount: number,
  callWithRequest: KibanaFramework['callWithRequest']
) {
  const finalizeEsSearchSpan = startTracingSpan('Fetch log rate examples from ES');

  const {
    hits: { hits },
  } = decodeOrThrow(logEntryRateExamplesResponseRT)(
    await callWithRequest(
      context,
      'search',
      createLogEntryRateExamplesQuery(
        indices,
        timestampField,
        tiebreakerField,
        startTime,
        endTime,
        dataset,
        exampleCount
      )
    )
  );

  const esSearchSpan = finalizeEsSearchSpan();

  return {
    examples: hits.map((hit) => ({
      id: hit._id,
      dataset,
      message: hit._source.message ?? '',
      timestamp: hit.sort[0],
      tiebreaker: hit.sort[1],
    })),
    timing: {
      spans: [esSearchSpan],
    },
  };
}

async function fetchMlJob(
  context: RequestHandlerContext & { infra: Required<InfraRequestHandlerContext> },
  logEntryRateJobId: string
) {
  const finalizeMlGetJobSpan = startTracingSpan('Fetch ml job from ES');
  const {
    jobs: [mlJob],
  } = await context.infra.mlAnomalyDetectors.jobs(logEntryRateJobId);

  const mlGetJobSpan = finalizeMlGetJobSpan();

  if (mlJob == null) {
    throw new NoLogAnalysisMlJobError(`Failed to find ml job ${logEntryRateJobId}.`);
  }

  return {
    mlJob,
    timing: {
      spans: [mlGetJobSpan],
    },
  };
}
