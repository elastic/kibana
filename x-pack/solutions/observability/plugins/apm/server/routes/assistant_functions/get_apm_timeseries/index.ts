/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import * as t from 'io-ts';
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

export const getApmTimeseriesRt = t.type({
  stats: t.array(
    t.intersection([
      t.type({
        'service.name': t.string,
        title: t.string,
        timeseries: t.union([
          t.intersection([
            t.type({
              name: t.union([
                t.literal(ApmTimeseriesType.transactionThroughput),
                t.literal(ApmTimeseriesType.transactionFailureRate),
              ]),
            }),
            t.partial({
              'transaction.type': t.string,
              'transaction.name': t.string,
            }),
          ]),
          t.intersection([
            t.type({
              name: t.union([
                t.literal(ApmTimeseriesType.exitSpanThroughput),
                t.literal(ApmTimeseriesType.exitSpanFailureRate),
                t.literal(ApmTimeseriesType.exitSpanLatency),
              ]),
            }),
            t.partial({
              'span.destination.service.resource': t.string,
            }),
          ]),
          t.intersection([
            t.type({
              name: t.literal(ApmTimeseriesType.transactionLatency),
              function: t.union([
                t.literal(LatencyAggregationType.avg),
                t.literal(LatencyAggregationType.p95),
                t.literal(LatencyAggregationType.p99),
              ]),
            }),
            t.partial({
              'transaction.type': t.string,
              'transaction.name': t.string,
            }),
          ]),
          t.type({
            name: t.literal(ApmTimeseriesType.errorEventRate),
          }),
        ]),
      }),
      t.partial({
        filter: t.string,
        offset: t.string,
        'service.environment': t.string,
      }),
    ])
  ),
  start: t.string,
  end: t.string,
});

type ApmTimeseriesArgs = t.TypeOf<typeof getApmTimeseriesRt>;

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
  arguments: t.TypeOf<typeof getApmTimeseriesRt>;
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
