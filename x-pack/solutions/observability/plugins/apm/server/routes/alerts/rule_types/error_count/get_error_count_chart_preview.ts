/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getParsedFilterQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { ERROR_GROUP_ID, PROCESSOR_EVENT, SERVICE_NAME } from '../../../../../common/es_fields/apm';
import { AlertParams, PreviewChartResponse } from '../../route';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
import { getGroupByTerms } from '../utils/get_groupby_terms';
import { getAllGroupByFields } from '../../../../../common/rules/get_all_groupby_fields';
import {
  BarSeriesDataMap,
  getFilteredBarSeries,
} from '../utils/get_filtered_series_for_preview_chart';

export async function getTransactionErrorCountChartPreview({
  apmEventClient,
  alertParams,
}: {
  apmEventClient: APMEventClient;
  alertParams: AlertParams;
}): Promise<PreviewChartResponse> {
  const {
    serviceName,
    environment,
    errorGroupingKey,
    interval,
    start,
    end,
    groupBy: groupByFields,
    searchConfiguration,
  } = alertParams;

  const allGroupByFields = getAllGroupByFields(ApmRuleType.ErrorCount, groupByFields);

  const termFilterQuery = !searchConfiguration
    ? [
        ...termQuery(SERVICE_NAME, serviceName, {
          queryEmptyString: false,
        }),
        ...termQuery(ERROR_GROUP_ID, errorGroupingKey, {
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
        { term: { [PROCESSOR_EVENT]: ProcessorEvent.error } },
      ],
    },
  };

  const aggs = {
    series: {
      multi_terms: {
        terms: getGroupByTerms(allGroupByFields),
        size: 1000,
        order: { _count: 'desc' as const },
      },
      aggs: {
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: interval,
            extended_bounds: {
              min: start,
              max: end,
            },
          },
        },
      },
    },
  };

  const params = {
    apm: { events: [ProcessorEvent.error] },
    body: { size: 0, track_total_hits: false, query, aggs },
  };

  const resp = await apmEventClient.search('get_error_count_chart_preview', params);

  if (!resp.aggregations) {
    return { series: [], totalGroups: 0 };
  }

  const seriesDataMap = resp.aggregations.series.buckets.reduce((acc, bucket) => {
    const bucketKey = bucket.key.join('_');
    bucket.timeseries.buckets.forEach((timeseriesBucket) => {
      const x = timeseriesBucket.key;
      const y = timeseriesBucket.doc_count;

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
