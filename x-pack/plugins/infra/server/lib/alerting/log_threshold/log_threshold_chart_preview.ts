/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  GroupedSearchQueryResponse,
  GroupedSearchQueryResponseRT,
  isOptimizedGroupedSearchQueryResponse,
  UngroupedSearchQueryResponse,
  UngroupedSearchQueryResponseRT,
} from '../../../../common/alerting/logs/log_threshold/types';
import {
  GetLogAlertsChartPreviewDataAlertParamsSubset,
  Point,
  Series,
} from '../../../../common/http_api/log_alerts';
import { ResolvedLogView } from '../../../../common/log_views';
import { decodeOrThrow } from '../../../../common/runtime_types';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import { KibanaFramework } from '../../adapters/framework/kibana_framework_adapter';
import {
  buildFiltersFromCriteria,
  getGroupedESQuery,
  getUngroupedESQuery,
} from './log_threshold_executor';

const COMPOSITE_GROUP_SIZE = 40;

export async function getChartPreviewData(
  requestContext: InfraPluginRequestHandlerContext,
  resolvedLogView: ResolvedLogView,
  callWithRequest: KibanaFramework['callWithRequest'],
  alertParams: GetLogAlertsChartPreviewDataAlertParamsSubset,
  buckets: number
) {
  const { indices, timestampField, runtimeMappings } = resolvedLogView;
  const { groupBy, timeSize, timeUnit } = alertParams;
  const isGrouped = groupBy && groupBy.length > 0 ? true : false;

  // Charts will use an expanded time range
  const expandedAlertParams = {
    ...alertParams,
    timeSize: timeSize * buckets,
  };

  const executionTimestamp = Date.now();
  const { rangeFilter } = buildFiltersFromCriteria(
    expandedAlertParams,
    timestampField,
    executionTimestamp
  );

  const query = isGrouped
    ? getGroupedESQuery(
        expandedAlertParams,
        timestampField,
        indices,
        runtimeMappings,
        executionTimestamp
      )
    : getUngroupedESQuery(
        expandedAlertParams,
        timestampField,
        indices,
        runtimeMappings,
        executionTimestamp
      );

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
    const isOptimizedQuery = !query.body.aggregations.groups.aggregations?.filtered_results;

    if (isOptimizedQuery) {
      query.body.aggregations.groups.aggregations = {
        ...query.body.aggregations.groups.aggregations,
        ...histogramAggregation,
      };
    } else {
      query.body.aggregations.groups.aggregations.filtered_results = {
        ...query.body.aggregations.groups.aggregations.filtered_results,
        aggregations: histogramAggregation,
      };
    }
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
  requestContext: InfraPluginRequestHandlerContext,
  callWithRequest: KibanaFramework['callWithRequest']
) => {
  return decodeOrThrow(UngroupedSearchQueryResponseRT)(
    await callWithRequest(requestContext, 'search', query)
  );
};

const getGroupedResults = async (
  query: object,
  requestContext: InfraPluginRequestHandlerContext,
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
  const getGroupName = (
    key: GroupedSearchQueryResponse['aggregations']['groups']['buckets'][0]['key']
  ) => Object.values(key).join(', ');

  if (isOptimizedGroupedSearchQueryResponse(results)) {
    return results.reduce<Series>((series, group) => {
      if (!group.histogramBuckets) return series;
      const groupName = getGroupName(group.key);
      const points = group.histogramBuckets.buckets.reduce<Point[]>((pointsAcc, bucket) => {
        const { key, doc_count: count } = bucket;
        return [...pointsAcc, { timestamp: key, value: count }];
      }, []);
      return [...series, { id: groupName, points }];
    }, []);
  } else {
    return results.reduce<Series>((series, group) => {
      if (!group.filtered_results.histogramBuckets) return series;
      const groupName = getGroupName(group.key);
      const points = group.filtered_results.histogramBuckets.buckets.reduce<Point[]>(
        (pointsAcc, bucket) => {
          const { key, doc_count: count } = bucket;
          return [...pointsAcc, { timestamp: key, value: count }];
        },
        []
      );
      return [...series, { id: groupName, points }];
    }, []);
  }
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
