/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mapValues } from 'lodash';
import { i18n } from '@kbn/i18n';
import { convertSavedObjectToSavedSourceConfiguration } from '../../sources/sources';
import { infraSourceConfigurationSavedObjectType } from '../../sources/saved_object_mappings';
import { InfraDatabaseSearchResponse } from '../../adapters/framework/adapter_types';
import { createAfterKeyHandler } from '../../../utils/create_afterkey_handler';
import { getAllCompositeData } from '../../../utils/get_all_composite_data';
import { networkTraffic } from '../../../../common/inventory_models/shared/metrics/snapshot/network_traffic';
import { MetricExpressionParams, Comparator, AlertStates } from './types';
import { AlertServices, AlertExecutorOptions } from '../../../../../alerting/server';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { getDateHistogramOffset } from '../../snapshot/query_helpers';

const TOTAL_BUCKETS = 5;
const DEFAULT_INDEX_PATTERN = 'metricbeat-*';

interface Aggregation {
  aggregatedIntervals: {
    buckets: Array<{ aggregatedValue: { value: number }; doc_count: number }>;
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
    if (aggType === 'count') {
      return mostRecentBucket.doc_count;
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
  try {
    return JSON.parse(filterQuery).bool;
  } catch (e) {
    return [
      {
        query_string: {
          query: filterQuery,
          analyze_wildcard: true,
        },
      },
    ];
  }
};

export const getElasticsearchMetricQuery = (
  { metric, aggType, timeUnit, timeSize }: MetricExpressionParams,
  groupBy?: string,
  filterQuery?: string
) => {
  if (aggType === 'count' && metric) {
    throw new Error('Cannot aggregate document count with a metric');
  }
  if (aggType !== 'count' && !metric) {
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
    aggType === 'count'
      ? {}
      : aggType === 'rate'
      ? networkTraffic('aggregatedValue', metric)
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
        field: '@timestamp',
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
            sources: [
              {
                groupBy: {
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

const getIndexPattern: (
  services: AlertServices,
  sourceId?: string
) => Promise<string> = async function ({ savedObjectsClient }, sourceId = 'default') {
  try {
    const sourceConfiguration = await savedObjectsClient.get(
      infraSourceConfigurationSavedObjectType,
      sourceId
    );
    const { metricAlias } = convertSavedObjectToSavedSourceConfiguration(
      sourceConfiguration
    ).configuration;
    return metricAlias || DEFAULT_INDEX_PATTERN;
  } catch (e) {
    if (e.output.statusCode === 404) {
      return DEFAULT_INDEX_PATTERN;
    } else {
      throw e;
    }
  }
};

const getMetric: (
  services: AlertServices,
  params: MetricExpressionParams,
  index: string,
  groupBy: string | undefined,
  filterQuery: string | undefined
) => Promise<Record<string, number>> = async function (
  { savedObjectsClient, callCluster },
  params,
  index,
  groupBy,
  filterQuery
) {
  const { aggType } = params;
  const searchBody = getElasticsearchMetricQuery(params, groupBy, filterQuery);

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
      )) as Array<Aggregation & { key: { groupBy: string } }>;
      return compositeBuckets.reduce(
        (result, bucket) => ({
          ...result,
          [bucket.key.groupBy]: getCurrentValueFromAggregations(bucket, aggType),
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
  // `threshold` is always an array of numbers in case the BETWEEN comparator is
  // used; all other compartors will just destructure the first value in the array
  [Comparator.GT]: (a: number, [b]: number[]) => a > b,
  [Comparator.LT]: (a: number, [b]: number[]) => a < b,
  [Comparator.GT_OR_EQ]: (a: number, [b]: number[]) => a >= b,
  [Comparator.LT_OR_EQ]: (a: number, [b]: number[]) => a <= b,
};

const mapToConditionsLookup = (
  list: any[],
  mapFn: (value: any, index: number, array: any[]) => unknown
) =>
  list
    .map(mapFn)
    .reduce(
      (result: Record<string, any>, value, i) => ({ ...result, [`condition${i}`]: value }),
      {}
    );

export const createMetricThresholdExecutor = (alertUUID: string) =>
  async function ({ services, params }: AlertExecutorOptions) {
    const { criteria, groupBy, filterQuery, sourceId } = params as {
      criteria: MetricExpressionParams[];
      groupBy: string | undefined;
      filterQuery: string | undefined;
      sourceId?: string;
    };

    const alertResults = await Promise.all(
      criteria.map((criterion) =>
        (async () => {
          const index = await getIndexPattern(services, sourceId);
          const currentValues = await getMetric(services, criterion, index, groupBy, filterQuery);
          const { threshold, comparator } = criterion;
          const comparisonFunction = comparatorMap[comparator];
          return mapValues(currentValues, (value) => ({
            shouldFire:
              value !== undefined && value !== null && comparisonFunction(value, threshold),
            currentValue: value,
            isNoData: value === null,
            isError: value === undefined,
          }));
        })()
      )
    );

    const groups = Object.keys(alertResults[0]);
    for (const group of groups) {
      const alertInstance = services.alertInstanceFactory(`${alertUUID}-${group}`);

      // AND logic; all criteria must be across the threshold
      const shouldAlertFire = alertResults.every((result) => result[group].shouldFire);
      // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
      // whole alert is in a No Data/Error state
      const isNoData = alertResults.some((result) => result[group].isNoData);
      const isError = alertResults.some((result) => result[group].isError);
      if (shouldAlertFire) {
        alertInstance.scheduleActions(FIRED_ACTIONS.id, {
          group,
          valueOf: mapToConditionsLookup(alertResults, (result) => result[group].currentValue),
          thresholdOf: mapToConditionsLookup(criteria, (criterion) => criterion.threshold),
          metricOf: mapToConditionsLookup(criteria, (criterion) => criterion.metric),
        });
      }
      // Future use: ability to fetch display current alert state
      alertInstance.replaceState({
        alertState: isError
          ? AlertStates.ERROR
          : isNoData
          ? AlertStates.NO_DATA
          : shouldAlertFire
          ? AlertStates.ALERT
          : AlertStates.OK,
      });
    }
  };

export const FIRED_ACTIONS = {
  id: 'metrics.threshold.fired',
  name: i18n.translate('xpack.infra.metrics.alerting.threshold.fired', {
    defaultMessage: 'Fired',
  }),
};
