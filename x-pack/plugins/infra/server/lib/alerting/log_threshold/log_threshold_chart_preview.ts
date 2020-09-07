/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { RequestHandlerContext } from 'src/core/server';
import { InfraSource } from '../../sources';
import { KibanaFramework } from '../../adapters/framework/kibana_framework_adapter';
import {
  GetLogAlertsChartPreviewDataAlertParamsSubset,
  Series,
  Point,
} from '../../../../common/http_api/log_alerts';
import {
  getGroupedESQuery,
  getUngroupedESQuery,
  buildFiltersFromCriteria,
} from './log_threshold_executor';
import {
  UngroupedSearchQueryResponseRT,
  UngroupedSearchQueryResponse,
  GroupedSearchQueryResponse,
  GroupedSearchQueryResponseRT,
} from '../../../../common/alerting/logs/types';
import { decodeOrThrow } from '../../../../common/runtime_types';

const COMPOSITE_GROUP_SIZE = 40;

export async function getChartPreviewData(
  requestContext: RequestHandlerContext,
  sourceConfiguration: InfraSource,
  callWithRequest: KibanaFramework['callWithRequest'],
  alertParams: GetLogAlertsChartPreviewDataAlertParamsSubset,
  buckets: number
) {
  const indexPattern = sourceConfiguration.configuration.logAlias;
  const timestampField = sourceConfiguration.configuration.fields.timestamp;

  const { groupBy, timeSize, timeUnit } = alertParams;
  const isGrouped = groupBy && groupBy.length > 0 ? true : false;

  // Charts will use an expanded time range
  const expandedAlertParams = {
    ...alertParams,
    timeSize: timeSize * buckets,
  };

  const { rangeFilter } = buildFiltersFromCriteria(expandedAlertParams, timestampField);

  const query = isGrouped
    ? getGroupedESQuery(expandedAlertParams, sourceConfiguration.configuration, indexPattern)
    : getUngroupedESQuery(expandedAlertParams, sourceConfiguration.configuration, indexPattern);

  if (!query) {
    throw new Error('ES query could not be built from the provided alert params');
  }

  const expandedQuery = addHistogramAggregationToQuery(
    query,
    rangeFilter,
    `${timeSize}${timeUnit}`,
    timestampField,
    isGrouped
  );

  const series = isGrouped
    ? processGroupedResults(await getGroupedResults(expandedQuery, requestContext, callWithRequest))
    : processUngroupedResults(
        await getUngroupedResults(expandedQuery, requestContext, callWithRequest)
      );

  return { series };
}

// Expand the same query that powers the executor with a date histogram aggregation
const addHistogramAggregationToQuery = (
  query: any,
  rangeFilter: any,
  interval: string,
  timestampField: string,
  isGrouped: boolean
) => {
  const histogramAggregation = {
    histogramBuckets: {
      date_histogram: {
        field: timestampField,
        fixed_interval: interval,
        // Utilise extended bounds to make sure we get a full set of buckets even if there are empty buckets
        // at the start and / or end of the range.
        extended_bounds: {
          min: rangeFilter.range[timestampField].gte,
          max: rangeFilter.range[timestampField].lte,
        },
      },
    },
  };

  if (isGrouped) {
    query.body.aggregations.groups.aggregations.filtered_results = {
      ...query.body.aggregations.groups.aggregations.filtered_results,
      aggregations: histogramAggregation,
    };
  } else {
    query.body = {
      ...query.body,
      aggregations: histogramAggregation,
    };
  }

  return query;
};

const getUngroupedResults = async (
  query: object,
  requestContext: RequestHandlerContext,
  callWithRequest: KibanaFramework['callWithRequest']
) => {
  return decodeOrThrow(UngroupedSearchQueryResponseRT)(
    await callWithRequest(requestContext, 'search', query)
  );
};

const getGroupedResults = async (
  query: object,
  requestContext: RequestHandlerContext,
  callWithRequest: KibanaFramework['callWithRequest']
) => {
  let compositeGroupBuckets: GroupedSearchQueryResponse['aggregations']['groups']['buckets'] = [];
  let lastAfterKey: GroupedSearchQueryResponse['aggregations']['groups']['after_key'] | undefined;

  while (true) {
    const queryWithAfterKey: any = { ...query };
    queryWithAfterKey.body.aggregations.groups.composite.after = lastAfterKey;
    const groupResponse: GroupedSearchQueryResponse = decodeOrThrow(GroupedSearchQueryResponseRT)(
      await callWithRequest(requestContext, 'search', queryWithAfterKey)
    );
    compositeGroupBuckets = [
      ...compositeGroupBuckets,
      ...groupResponse.aggregations.groups.buckets,
    ];
    lastAfterKey = groupResponse.aggregations.groups.after_key;
    if (groupResponse.aggregations.groups.buckets.length < COMPOSITE_GROUP_SIZE) {
      break;
    }
  }

  return compositeGroupBuckets;
};

const processGroupedResults = (
  results: GroupedSearchQueryResponse['aggregations']['groups']['buckets']
): Series => {
  return results.reduce<Series>((series, group) => {
    if (!group.filtered_results.histogramBuckets) return series;
    const groupName = Object.values(group.key).join(', ');
    const points = group.filtered_results.histogramBuckets.buckets.reduce<Point[]>(
      (pointsAcc, bucket) => {
        const { key, doc_count: count } = bucket;
        return [...pointsAcc, { timestamp: key, value: count }];
      },
      []
    );
    return [...series, { id: groupName, points }];
  }, []);
};

const processUngroupedResults = (results: UngroupedSearchQueryResponse): Series => {
  if (!results.aggregations?.histogramBuckets) return [];
  const points = results.aggregations.histogramBuckets.buckets.reduce<Point[]>(
    (pointsAcc, bucket) => {
      const { key, doc_count: count } = bucket;
      return [...pointsAcc, { timestamp: key, value: count }];
    },
    []
  );
  return [{ id: everythingSeriesName, points }];
};

const everythingSeriesName = i18n.translate(
  'xpack.infra.logs.alerting.threshold.everythingSeriesName',
  {
    defaultMessage: 'Log entries',
  }
);
