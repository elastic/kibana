/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mapValues, first } from 'lodash';
import { i18n } from '@kbn/i18n';
import { InfraDatabaseSearchResponse } from '../../adapters/framework/adapter_types';
import { createAfterKeyHandler } from '../../../utils/create_afterkey_handler';
import { getAllCompositeData } from '../../../utils/get_all_composite_data';
import { networkTraffic } from '../../../../common/inventory_models/shared/metrics/snapshot/network_traffic';
import { MetricExpressionParams, Comparator, Aggregators, AlertStates } from './types';
import {
  buildErrorAlertReason,
  buildFiredAlertReason,
  buildNoDataAlertReason,
  DOCUMENT_COUNT_I18N,
  stateToAlertMessage,
} from './messages';
import { AlertServices, AlertExecutorOptions } from '../../../../../alerts/server';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { getDateHistogramOffset } from '../../snapshot/query_helpers';
import { InfraBackendLibs } from '../../infra_types';
import { createPercentileAggregation } from './create_percentile_aggregation';

const TOTAL_BUCKETS = 5;

interface Aggregation {
  aggregatedIntervals: {
    buckets: Array<{
      aggregatedValue: { value: number; values?: Array<{ key: number; value: number }> };
      doc_count: number;
    }>;
  };
}

interface CompositeAggregationsResponse {
  groupings: {
    buckets: Aggregation[];
  };
}

const getCurrentValueFromAggregations = (
  aggregations: Aggregation,
  aggType: MetricExpressionParams['aggType']
) => {
  try {
    const { buckets } = aggregations.aggregatedIntervals;
    if (!buckets.length) return null; // No Data state
    const mostRecentBucket = buckets[buckets.length - 1];
    if (aggType === Aggregators.COUNT) {
      return mostRecentBucket.doc_count;
    }
    if (aggType === Aggregators.P95 || aggType === Aggregators.P99) {
      const values = mostRecentBucket.aggregatedValue?.values || [];
      const firstValue = first(values);
      if (!firstValue) return null;
      return firstValue.value;
    }
    const { value } = mostRecentBucket.aggregatedValue;
    return value;
  } catch (e) {
    return undefined; // Error state
  }
};

const getParsedFilterQuery: (
  filterQuery: string | undefined
) => Record<string, any> | Array<Record<string, any>> = (filterQuery) => {
  if (!filterQuery) return {};
  return JSON.parse(filterQuery).bool;
};

export const getElasticsearchMetricQuery = (
  { metric, aggType, timeUnit, timeSize }: MetricExpressionParams,
  timefield: string,
  groupBy?: string | string[],
  filterQuery?: string
) => {
  if (aggType === Aggregators.COUNT && metric) {
    throw new Error('Cannot aggregate document count with a metric');
  }
  if (aggType !== Aggregators.COUNT && !metric) {
    throw new Error('Can only aggregate without a metric if using the document count aggregator');
  }
  const interval = `${timeSize}${timeUnit}`;
  const to = Date.now();
  const intervalAsSeconds = getIntervalInSeconds(interval);
  // We need enough data for 5 buckets worth of data. We also need
  // to convert the intervalAsSeconds to milliseconds.
  const from = to - intervalAsSeconds * 1000 * TOTAL_BUCKETS;
  const offset = getDateHistogramOffset(from, interval);

  const aggregations =
    aggType === Aggregators.COUNT
      ? {}
      : aggType === Aggregators.RATE
      ? networkTraffic('aggregatedValue', metric)
      : aggType === Aggregators.P95 || aggType === Aggregators.P99
      ? createPercentileAggregation(aggType, metric)
      : {
          aggregatedValue: {
            [aggType]: {
              field: metric,
            },
          },
        };

  const baseAggs = {
    aggregatedIntervals: {
      date_histogram: {
        field: timefield,
        fixed_interval: interval,
        offset,
        extended_bounds: {
          min: from,
          max: to,
        },
      },
      aggregations,
    },
  };

  const aggs = groupBy
    ? {
        groupings: {
          composite: {
            size: 10,
            sources: Array.isArray(groupBy)
              ? groupBy.map((field, index) => ({
                  [`groupBy${index}`]: {
                    terms: { field },
                  },
                }))
              : [
                  {
                    groupBy0: {
                      terms: {
                        field: groupBy,
                      },
                    },
                  },
                ],
          },
          aggs: baseAggs,
        },
      }
    : baseAggs;

  const rangeFilters = [
    {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
          format: 'epoch_millis',
        },
      },
    },
  ];

  const metricFieldFilters = metric
    ? [
        {
          exists: {
            field: metric,
          },
        },
      ]
    : [];

  const parsedFilterQuery = getParsedFilterQuery(filterQuery);

  return {
    query: {
      bool: {
        filter: [
          ...rangeFilters,
          ...metricFieldFilters,
          ...(Array.isArray(parsedFilterQuery) ? parsedFilterQuery : []),
        ],
        ...(!Array.isArray(parsedFilterQuery) ? parsedFilterQuery : {}),
      },
    },
    size: 0,
    aggs,
  };
};

const getMetric: (
  services: AlertServices,
  params: MetricExpressionParams,
  index: string,
  timefield: string,
  groupBy: string | undefined | string[],
  filterQuery: string | undefined
) => Promise<Record<string, number>> = async function (
  { callCluster },
  params,
  index,
  timefield,
  groupBy,
  filterQuery
) {
  const { aggType } = params;
  const searchBody = getElasticsearchMetricQuery(params, timefield, groupBy, filterQuery);

  try {
    if (groupBy) {
      const bucketSelector = (
        response: InfraDatabaseSearchResponse<{}, CompositeAggregationsResponse>
      ) => response.aggregations?.groupings?.buckets || [];
      const afterKeyHandler = createAfterKeyHandler(
        'aggs.groupings.composite.after',
        (response) => response.aggregations?.groupings?.after_key
      );
      const compositeBuckets = (await getAllCompositeData(
        (body) => callCluster('search', { body, index }),
        searchBody,
        bucketSelector,
        afterKeyHandler
      )) as Array<Aggregation & { key: Record<string, string> }>;
      return compositeBuckets.reduce(
        (result, bucket) => ({
          ...result,
          [Object.values(bucket.key)
            .map((value) => value)
            .join(', ')]: getCurrentValueFromAggregations(bucket, aggType),
        }),
        {}
      );
    }
    const result = await callCluster('search', {
      body: searchBody,
      index,
    });

    return { '*': getCurrentValueFromAggregations(result.aggregations, aggType) };
  } catch (e) {
    return { '*': undefined }; // Trigger an Error state
  }
};

const comparatorMap = {
  [Comparator.BETWEEN]: (value: number, [a, b]: number[]) =>
    value >= Math.min(a, b) && value <= Math.max(a, b),
  [Comparator.OUTSIDE_RANGE]: (value: number, [a, b]: number[]) => value < a || value > b,
  // `threshold` is always an array of numbers in case the BETWEEN/OUTSIDE_RANGE comparator is
  // used; all other compartors will just destructure the first value in the array
  [Comparator.GT]: (a: number, [b]: number[]) => a > b,
  [Comparator.LT]: (a: number, [b]: number[]) => a < b,
  [Comparator.GT_OR_EQ]: (a: number, [b]: number[]) => a >= b,
  [Comparator.LT_OR_EQ]: (a: number, [b]: number[]) => a <= b,
};

export const createMetricThresholdExecutor = (libs: InfraBackendLibs, alertId: string) =>
  async function ({ services, params }: AlertExecutorOptions) {
    const { criteria, groupBy, filterQuery, sourceId, alertOnNoData } = params as {
      criteria: MetricExpressionParams[];
      groupBy: string | undefined | string[];
      filterQuery: string | undefined;
      sourceId?: string;
      alertOnNoData: boolean;
    };

    const source = await libs.sources.getSourceConfiguration(
      services.savedObjectsClient,
      sourceId || 'default'
    );
    const config = source.configuration;
    const alertResults = await Promise.all(
      criteria.map((criterion) => {
        return (async () => {
          const currentValues = await getMetric(
            services,
            criterion,
            config.metricAlias,
            config.fields.timestamp,
            groupBy,
            filterQuery
          );
          const { threshold, comparator } = criterion;
          const comparisonFunction = comparatorMap[comparator];
          return mapValues(currentValues, (value) => ({
            ...criterion,
            metric: criterion.metric ?? DOCUMENT_COUNT_I18N,
            currentValue: value,
            shouldFire:
              value !== undefined && value !== null && comparisonFunction(value, threshold),
            isNoData: value === null,
            isError: value === undefined,
          }));
        })();
      })
    );

    // Because each alert result has the same group definitions, just grap the groups from the first one.
    const groups = Object.keys(first(alertResults));
    for (const group of groups) {
      const alertInstance = services.alertInstanceFactory(`${alertId}-${group}`);

      // AND logic; all criteria must be across the threshold
      const shouldAlertFire = alertResults.every((result) => result[group].shouldFire);
      // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
      // whole alert is in a No Data/Error state
      const isNoData = alertResults.some((result) => result[group].isNoData);
      const isError = alertResults.some((result) => result[group].isError);

      const nextState = isError
        ? AlertStates.ERROR
        : isNoData
        ? AlertStates.NO_DATA
        : shouldAlertFire
        ? AlertStates.ALERT
        : AlertStates.OK;

      let reason;
      if (nextState === AlertStates.ALERT) {
        reason = alertResults.map((result) => buildFiredAlertReason(result[group])).join('\n');
      }
      if (alertOnNoData) {
        if (nextState === AlertStates.NO_DATA) {
          reason = alertResults
            .filter((result) => result[group].isNoData)
            .map((result) => buildNoDataAlertReason(result[group]))
            .join('\n');
        } else if (nextState === AlertStates.ERROR) {
          reason = alertResults
            .filter((result) => result[group].isError)
            .map((result) => buildErrorAlertReason(result[group].metric))
            .join('\n');
        }
      }
      if (reason) {
        alertInstance.scheduleActions(FIRED_ACTIONS.id, {
          group,
          alertState: stateToAlertMessage[nextState],
          reason,
        });
      }

      // Future use: ability to fetch display current alert state
      alertInstance.replaceState({
        alertState: nextState,
      });
    }
  };

export const FIRED_ACTIONS = {
  id: 'metrics.threshold.fired',
  name: i18n.translate('xpack.infra.metrics.alerting.threshold.fired', {
    defaultMessage: 'Fired',
  }),
};
