/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getParsedFilterQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { AggregationType } from '../../../../../common/rules/apm_rule_types';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
} from '../../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { AlertParams, PreviewChartResponse } from '../../route';
import {
  getSearchTransactionsEvents,
  getBackwardCompatibleDocumentTypeFilter,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../../../lib/helpers/transactions';
import { averageOrPercentileAgg, getMultiTermsSortOrder } from './average_or_percentile_agg';
import { APMConfig } from '../../../..';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
import { getGroupByTerms } from '../utils/get_groupby_terms';
import { getAllGroupByFields } from '../../../../../common/rules/get_all_groupby_fields';
import {
  BarSeriesDataMap,
  getFilteredBarSeries,
} from '../utils/get_filtered_series_for_preview_chart';

export async function getTransactionDurationChartPreview({
  alertParams,
  config,
  apmEventClient,
}: {
  alertParams: AlertParams;
  config: APMConfig;
  apmEventClient: APMEventClient;
}): Promise<PreviewChartResponse> {
  const {
    aggregationType = AggregationType.Avg,
    environment,
    serviceName,
    transactionType,
    transactionName,
    interval,
    start,
    end,
    groupBy: groupByFields,
    searchConfiguration,
  } = alertParams;
  const searchAggregatedTransactions = await getSearchTransactionsEvents({
    config,
    apmEventClient,
    kuery: '',
  });

  const termFilterQuery = !searchConfiguration
    ? [
        ...termQuery(SERVICE_NAME, serviceName, {
          queryEmptyString: false,
        }),
        ...termQuery(TRANSACTION_TYPE, transactionType, {
          queryEmptyString: false,
        }),
        ...termQuery(TRANSACTION_NAME, transactionName, {
          queryEmptyString: false,
        }),
        ...environmentQuery(environment),
      ]
    : [];

  const query = {
    bool: {
      filter: [
        ...termFilterQuery,
        ...getParsedFilterQuery(searchConfiguration?.query?.query as string),
        ...rangeQuery(start, end),
        ...getBackwardCompatibleDocumentTypeFilter(searchAggregatedTransactions),
      ] as QueryDslQueryContainer[],
    },
  };

  const transactionDurationField = getDurationFieldForTransactions(searchAggregatedTransactions);

  const allGroupByFields = getAllGroupByFields(ApmRuleType.TransactionDuration, groupByFields);

  const aggs = {
    series: {
      multi_terms: {
        terms: getGroupByTerms(allGroupByFields),
        size: 1000,
      },
      aggs: {
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: interval,
            min_doc_count: 0,
            extended_bounds: {
              min: start,
              max: end,
            },
            ...getMultiTermsSortOrder(aggregationType),
          },
          aggs: {
            ...averageOrPercentileAgg({
              aggregationType,
              transactionDurationField,
            }),
          },
        },
      },
    },
  };
  const params = {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: { size: 0, track_total_hits: false, query, aggs },
  };

  const resp = await apmEventClient.search('get_transaction_duration_chart_preview', params);

  if (!resp.aggregations) {
    return { series: [], totalGroups: 0 };
  }

  const seriesDataMap = resp.aggregations.series.buckets.reduce((acc, bucket) => {
    const bucketKey = bucket.key.join('_');
    bucket.timeseries.buckets.forEach((timeseriesBucket) => {
      const x = timeseriesBucket.key;
      const y =
        'avgLatency' in timeseriesBucket
          ? timeseriesBucket.avgLatency.value
          : timeseriesBucket.pctLatency.values[0].value;
      if (acc[bucketKey]) {
        acc[bucketKey].push({ x, y });
      } else {
        acc[bucketKey] = [{ x, y }];
      }
    });

    return acc;
  }, {} as BarSeriesDataMap);

  const series = Object.keys(seriesDataMap).map((key) => ({
    name: key,
    data: seriesDataMap[key],
  }));

  const filteredSeries = getFilteredBarSeries(series);

  return {
    series: filteredSeries,
    totalGroups: series.length,
  };
}
