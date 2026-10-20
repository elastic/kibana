/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { z } from '@kbn/zod/v4';
import type { ChangePointType } from '@kbn/es-types/src';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getBucketSize } from '../../../../common/utils/get_bucket_size';
import { termQuery } from '../../../../common/utils/term_query';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getErrorEventRate } from './get_error_event_rate';
import { getExitSpanFailureRate } from './get_exit_span_failure_rate';
import { getExitSpanLatency } from './get_exit_span_latency';
import { getExitSpanThroughput } from './get_exit_span_throughput';
import { getTransactionFailureRate } from './get_transaction_failure_rate';
import { getTransactionLatency } from './get_transaction_latency';
import { getTransactionThroughput } from './get_transaction_throughput';

export enum ApmTimeseriesType {
  transactionThroughput = 'transaction_throughput',
  transactionLatency = 'transaction_latency',
  transactionFailureRate = 'transaction_failure_rate',
  exitSpanThroughput = 'exit_span_throughput',
  exitSpanLatency = 'exit_span_latency',
  exitSpanFailureRate = 'exit_span_failure_rate',
  errorEventRate = 'error_event_rate',
}

const timeseriesSchema = z.union([
  z.object({
    name: z.union([
      z.literal(ApmTimeseriesType.transactionThroughput),
      z.literal(ApmTimeseriesType.transactionFailureRate),
    ]),
    'transaction.type': z.string().optional(),
    'transaction.name': z.string().optional(),
  }),
  z.object({
    name: z.union([
      z.literal(ApmTimeseriesType.exitSpanThroughput),
      z.literal(ApmTimeseriesType.exitSpanFailureRate),
      z.literal(ApmTimeseriesType.exitSpanLatency),
    ]),
    'span.destination.service.resource': z.string().optional(),
  }),
  z.object({
    name: z.literal(ApmTimeseriesType.transactionLatency),
    function: z.union([
      z.literal(LatencyAggregationType.avg),
      z.literal(LatencyAggregationType.p95),
      z.literal(LatencyAggregationType.p99),
    ]),
    'transaction.type': z.string().optional(),
    'transaction.name': z.string().optional(),
  }),
  z.object({
    name: z.literal(ApmTimeseriesType.errorEventRate),
  }),
]);

export const getApmTimeseriesRt = z.object({
  stats: z.array(
    z.object({
      'service.name': z.string(),
      title: z.string(),
      timeseries: timeseriesSchema,
      filter: z.string().optional(),
      offset: z.string().optional(),
      'service.environment': z.string().optional(),
    })
  ),
  start: z.string(),
  end: z.string(),
});

type ApmTimeseriesArgs = z.infer<typeof getApmTimeseriesRt>;

export interface TimeseriesChangePoint {
  change_point?: number | undefined;
  r_value?: number | undefined;
  trend?: string | undefined;
  p_value?: number;
  date: string | undefined;
  type: ChangePointType;
}

export interface ApmTimeseries {
  stat: ApmTimeseriesArgs['stats'][number];
  group: string;
  id: string;
  data: Array<{ x: number; y: number | null }>;
  value: number | null;
  start: number;
  end: number;
  unit: string;
  changes: TimeseriesChangePoint[];
}

export async function getApmTimeseries({
  arguments: args,
  apmEventClient,
}: {
  arguments: z.infer<typeof getApmTimeseriesRt>;
  apmEventClient: APMEventClient;
}): Promise<ApmTimeseries[]> {
  const start = datemath.parse(args.start)!.valueOf();
  const end = datemath.parse(args.end)!.valueOf();

  const { bucketSize, intervalString } = getBucketSize({
    start,
    end,
    numBuckets: 100,
  });

  return (
    await Promise.all(
      args.stats.map(async (stat) => {
        const parameters = {
          apmEventClient,
          start,
          end,
          bucketSize,
          intervalString,
          filter: [
            ...rangeQuery(start, end),
            ...termQuery(SERVICE_NAME, stat['service.name']),
            ...kqlQuery(stat.filter),
            ...environmentQuery(stat['service.environment']),
          ],
        };
        const name = stat.timeseries.name;

        async function fetchSeriesForStat() {
          switch (name) {
            case ApmTimeseriesType.transactionThroughput:
              return await getTransactionThroughput({
                ...parameters,
                transactionType: stat.timeseries['transaction.type'],
                transactionName: stat.timeseries['transaction.name'],
              });

            case ApmTimeseriesType.transactionFailureRate:
              return await getTransactionFailureRate({
                ...parameters,
                transactionType: stat.timeseries['transaction.type'],
                transactionName: stat.timeseries['transaction.name'],
              });

            case ApmTimeseriesType.transactionLatency:
              return await getTransactionLatency({
                ...parameters,
                transactionType: stat.timeseries['transaction.type'],
                transactionName: stat.timeseries['transaction.name'],
                latencyAggregationType: stat.timeseries.function,
              });

            case ApmTimeseriesType.exitSpanThroughput:
              return await getExitSpanThroughput({
                ...parameters,
                spanDestinationServiceResource:
                  stat.timeseries['span.destination.service.resource'],
              });

            case ApmTimeseriesType.exitSpanFailureRate:
              return await getExitSpanFailureRate({
                ...parameters,
                spanDestinationServiceResource:
                  stat.timeseries['span.destination.service.resource'],
              });

            case ApmTimeseriesType.exitSpanLatency:
              return await getExitSpanLatency({
                ...parameters,
                spanDestinationServiceResource:
                  stat.timeseries['span.destination.service.resource'],
              });

            case ApmTimeseriesType.errorEventRate:
              return await getErrorEventRate(parameters);
          }
        }

        const allFetchedSeries = await fetchSeriesForStat();
        return allFetchedSeries.map((series) => ({ ...series, stat }));
      })
    )
  ).flatMap((statResults) =>
    statResults.flatMap((statResult) => {
      const changePointType = Object.keys(
        statResult.change_point?.type ?? {}
      )?.[0] as ChangePointType;

      return {
        stat: statResult.stat,
        group: statResult.stat.title,
        id: statResult.groupBy,
        data: statResult.data,
        value: statResult.value,
        start,
        end,
        unit: statResult.unit,
        changes: [
          ...(changePointType &&
          changePointType !== 'indeterminable' &&
          changePointType !== 'stationary'
            ? [
                {
                  date: statResult.change_point.bucket?.key,
                  type: changePointType,
                  ...statResult.change_point.type[changePointType],
                },
              ]
            : []),
        ],
      };
    })
  );
}
