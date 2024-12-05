/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten, orderBy, last, clamp, round } from 'lodash';
import { rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { asPercent } from '../../../../common/utils/formatters';
import {
  SERVICE_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  SPAN_SELF_TIME_SUM,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
} from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getMetricsDateHistogramParams } from '../../../lib/helpers/metrics';
import { MAX_KPIS } from './constants';
import { getVizColorForIndex } from '../../../../common/viz_colors';
import { APMConfig } from '../../..';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export interface TransactionBreakdownResponse {
  timeseries: Array<{
    title: string;
    color: string;
    type: string;
    data: Array<{ x: number; y: number | null }>;
    hideLegend: boolean;
    legendValue: any;
  }>;
}

export async function getTransactionBreakdown({
  environment,
  kuery,
  config,
  apmEventClient,
  serviceName,
  transactionName,
  transactionType,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName: string;
  transactionName?: string;
  transactionType: string;
  start: number;
  end: number;
}): Promise<TransactionBreakdownResponse> {
  const subAggs = {
    sum_all_self_times: {
      sum: {
        field: SPAN_SELF_TIME_SUM,
      },
    },
    types: {
      terms: {
        field: SPAN_TYPE,
        size: 20,
        order: {
          _count: 'desc' as const,
        },
      },
      aggs: {
        subtypes: {
          terms: {
            field: SPAN_SUBTYPE,
            missing: '',
            size: 20,
            order: {
              _count: 'desc' as const,
            },
          },
          aggs: {
            total_self_time_per_subtype: {
              sum: {
                field: SPAN_SELF_TIME_SUM,
              },
            },
          },
        },
      },
    },
  };

  const filters = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [TRANSACTION_TYPE]: transactionType } },
    ...rangeQuery(start, end),
    ...environmentQuery(environment),
    ...kqlQuery(kuery),
    { exists: { field: SPAN_SELF_TIME_SUM } },
  ];

  if (transactionName) {
    filters.push({ term: { [TRANSACTION_NAME]: transactionName } });
  }

  const params = {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        ...subAggs,
        by_date: {
          date_histogram: getMetricsDateHistogramParams({
            start,
            end,
            metricsInterval: config.metricsInterval,
          }),
          aggs: subAggs,
        },
      },
    },
  };

  const resp = await apmEventClient.search('get_transaction_breakdown', params);

  const formatBucket = (
    aggs:
      | Required<typeof resp>['aggregations']
      | Required<typeof resp>['aggregations']['by_date']['buckets'][0]
  ) => {
    const sumAllSelfTimes = aggs.sum_all_self_times.value || 0;

    const breakdowns = flatten(
      aggs.types.buckets.map((bucket) => {
        const type = bucket.key as string;

        return bucket.subtypes.buckets.map((subBucket) => {
          const percentageRaw =
            (subBucket.total_self_time_per_subtype.value || 0) / sumAllSelfTimes;
          // limit percentage from 0% to 100% and
          // round to 8 decimal points (results in 6 decimal points after converting to percentages) to prevent displaying scientific notation in charts
          const percentage = round(clamp(percentageRaw, 0, 1), 8);

          return {
            name: (subBucket.key as string) || type,
            percentage,
          };
        });
      })
    );

    return breakdowns;
  };

  const visibleKpis = resp.aggregations
    ? orderBy(formatBucket(resp.aggregations), 'percentage', 'desc').slice(0, MAX_KPIS)
    : [];

  const kpis = orderBy(
    visibleKpis.map((kpi) => ({
      ...kpi,
      lowerCaseName: kpi.name.toLowerCase(),
    })),
    'lowerCaseName'
  ).map((kpi, index) => {
    const { lowerCaseName, ...rest } = kpi;
    return {
      ...rest,
      color: getVizColorForIndex(index),
    };
  });

  const kpiNames = kpis.map((kpi) => kpi.name);

  const bucketsByDate = resp.aggregations?.by_date.buckets || [];

  const timeseriesPerSubtype = bucketsByDate.reduce((prev, bucket) => {
    const formattedValues = formatBucket(bucket);
    const time = bucket.key;

    const updatedSeries = kpiNames.reduce((p, kpiName) => {
      const { name, percentage } = formattedValues.find((val) => val.name === kpiName) || {
        name: kpiName,
        percentage: null,
      };

      if (!p[name]) {
        p[name] = [];
      }
      return {
        ...p,
        [name]: p[name].concat({
          x: time,
          y: percentage,
        }),
      };
    }, prev);

    const lastValues = Object.values(updatedSeries).map(last);

    // If for a given timestamp, some series have data, but others do not,
    // we have to set any null values to 0 to make sure the stacked area chart
    // is drawn correctly.
    // If we set all values to 0, the chart always displays null values as 0,
    // and the chart looks weird.
    const hasAnyValues = lastValues.some((value) => value?.y !== null);
    const hasNullValues = lastValues.some((value) => value?.y === null);

    if (hasAnyValues && hasNullValues) {
      Object.values(updatedSeries).forEach((series) => {
        const value = series[series.length - 1];
        const isEmpty = value.y === null;
        if (isEmpty) {
          // local mutation to prevent complicated map/reduce calls
          value.y = 0;
        }
      });
    }

    return updatedSeries;
  }, {} as Record<string, Array<{ x: number; y: number | null }>>);

  const timeseries = kpis.map((kpi) => ({
    title: kpi.name,
    color: kpi.color,
    type: 'areaStacked',
    data: timeseriesPerSubtype[kpi.name],
    hideLegend: false,
    legendValue: asPercent(kpi.percentage, 1),
  }));

  return { timeseries };
}
