/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import type { ChangePointType } from '@kbn/es-types/src';
import type { z } from '@kbn/zod/v4';
import type { getApmTimeseriesRt } from '@kbn/apm-types';
import { ApmTimeseriesType, type ApmTimeseries } from '@kbn/apm-types';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
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

export {
  ApmTimeseriesType,
  getApmTimeseriesRt,
  type ApmTimeseries,
  type TimeseriesChangePoint,
} from '@kbn/apm-types';

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
