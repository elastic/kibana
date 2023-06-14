/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  ERROR_GROUP_ID,
  PROCESSOR_EVENT,
  SERVICE_NAME,
} from '../../../../../common/es_fields/apm';
import { AlertParams } from '../../route';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
import { getGroupByTerms } from '../utils/get_groupby_terms';
import { getAllGroupByFields } from '../../../../../common/rules/get_all_groupby_fields';
import {
  ApmRuleType,
  INTERVAL_MULTIPLIER_FOR_LOOKBACK,
  PreviewChartResponse,
} from '../../../../../common/rules/apm_rule_types';
import { getIntervalInSeconds } from '../utils/get_interval_in_seconds';

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
    end,
    groupBy: groupByFields,
  } = alertParams;

  const allGroupByFields = getAllGroupByFields(
    ApmRuleType.ErrorCount,
    groupByFields
  );

  const intervalAsSeconds = getIntervalInSeconds(interval);
  const lookbackIntervalAsSeconds =
    intervalAsSeconds * INTERVAL_MULTIPLIER_FOR_LOOKBACK;
  const lookbackIntervalAsMs = lookbackIntervalAsSeconds * 1000;
  const start = end - lookbackIntervalAsMs;

  const query = {
    bool: {
      filter: [
        ...termQuery(SERVICE_NAME, serviceName, {
          queryEmptyString: false,
        }),
        ...termQuery(ERROR_GROUP_ID, errorGroupingKey, {
          queryEmptyString: false,
        }),
        ...rangeQuery(start, end),
        ...environmentQuery(environment),
        { term: { [PROCESSOR_EVENT]: ProcessorEvent.error } },
      ],
    },
  };

  const aggs = {
    timeseries: {
      date_histogram: {
        field: '@timestamp',
        fixed_interval: interval,
        extended_bounds: {
          min: start,
          max: end,
        },
      },
      aggs: {
        series: {
          multi_terms: {
            terms: getGroupByTerms(allGroupByFields),
            size: 1000,
            order: { _count: 'desc' as const },
          },
        },
      },
    },
  };

  const params = {
    apm: { events: [ProcessorEvent.error] },
    body: { size: 0, track_total_hits: false, query, aggs },
  };

  const resp = await apmEventClient.search(
    'get_error_count_chart_preview',
    params
  );

  if (!resp.aggregations) {
    return [];
  }

  const seriesDataMap = resp.aggregations.timeseries.buckets.reduce(
    (acc, bucket) => {
      const x = bucket.key;
      bucket.series.buckets.forEach((seriesBucket) => {
        const bucketKey = seriesBucket.key.join('_');
        const y = seriesBucket.doc_count;

        if (acc[bucketKey]) {
          acc[bucketKey].push({ x, y });
        } else {
          acc[bucketKey] = [{ x, y }];
        }
      });

      return acc;
    },
    {} as Record<string, Array<{ x: number; y: number | null }>>
  );

  return Object.keys(seriesDataMap).map((key) => ({
    name: key,
    data: seriesDataMap[key],
  }));
}
