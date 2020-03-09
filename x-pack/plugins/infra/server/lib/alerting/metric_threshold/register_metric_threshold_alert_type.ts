/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuid from 'uuid';
import { mapValues } from 'lodash';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { InfraDatabaseSearchResponse } from '../../adapters/framework/adapter_types';
import { createAfterKeyHandler } from '../../../utils/create_afterkey_handler';
import { getAllCompositeData } from '../../../utils/get_all_composite_data';
import { networkTraffic } from '../../../../common/inventory_models/shared/metrics/snapshot/network_traffic';
import {
  MetricExpressionParams,
  Comparator,
  AlertStates,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
} from './types';
import { AlertServices, PluginSetupContract } from '../../../../../alerting/server';

interface Aggregation {
  aggregatedIntervals: { buckets: Array<{ aggregatedValue: { value: number } }> };
}

interface CompositeAggregationsResponse {
  groupings: {
    buckets: Aggregation[];
  };
}

const FIRED_ACTIONS = {
  id: 'metrics.threshold.fired',
  name: i18n.translate('xpack.infra.metrics.alerting.threshold.fired', {
    defaultMessage: 'Fired',
  }),
};

const getCurrentValueFromAggregations = (aggregations: Aggregation) => {
  const { buckets } = aggregations.aggregatedIntervals;
  const { value } = buckets[buckets.length - 1].aggregatedValue;
  return value;
};

const getParsedFilterQuery: (
  filterQuery: string | undefined
) => Record<string, any> = filterQuery => {
  if (!filterQuery) return {};
  try {
    return JSON.parse(filterQuery).bool;
  } catch (e) {
    return {
      query_string: {
        query: filterQuery,
        analyze_wildcard: true,
      },
    };
  }
};

const getMetric: (
  services: AlertServices,
  params: MetricExpressionParams,
  groupBy: string | undefined,
  filterQuery: string | undefined
) => Promise<Record<string, number>> = async function(
  { callCluster },
  { metric, aggType, timeUnit, timeSize, indexPattern },
  groupBy,
  filterQuery
) {
  const interval = `${timeSize}${timeUnit}`;

  const aggregations =
    aggType === 'rate'
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

  const parsedFilterQuery = getParsedFilterQuery(filterQuery);

  const searchBody = {
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: `now-${interval}`,
              },
            },
          },
          {
            exists: {
              field: metric,
            },
          },
        ],
        ...parsedFilterQuery,
      },
    },
    size: 0,
    aggs,
  };

  if (groupBy) {
    const bucketSelector = (
      response: InfraDatabaseSearchResponse<{}, CompositeAggregationsResponse>
    ) => response.aggregations?.groupings?.buckets || [];
    const afterKeyHandler = createAfterKeyHandler(
      'aggs.groupings.composite.after',
      response => response.aggregations?.groupings?.after_key
    );
    const compositeBuckets = (await getAllCompositeData(
      body => callCluster('search', { body, index: indexPattern }),
      searchBody,
      bucketSelector,
      afterKeyHandler
    )) as Array<Aggregation & { key: { groupBy: string } }>;
    return compositeBuckets.reduce(
      (result, bucket) => ({
        ...result,
        [bucket.key.groupBy]: getCurrentValueFromAggregations(bucket),
      }),
      {}
    );
  }

  const result = await callCluster('search', {
    body: searchBody,
    index: indexPattern,
  });
  return { '*': getCurrentValueFromAggregations(result.aggregations) };
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

export async function registerMetricThresholdAlertType(alertingPlugin: PluginSetupContract) {
  if (!alertingPlugin) {
    throw new Error(
      'Cannot register metric threshold alert type.  Both the actions and alerting plugins need to be enabled.'
    );
  }
  const alertUUID = uuid.v4();

  alertingPlugin.registerType({
    id: METRIC_THRESHOLD_ALERT_TYPE_ID,
    name: 'Metric Alert - Threshold',
    validate: {
      params: schema.object({
        criteria: schema.arrayOf(
          schema.object({
            threshold: schema.arrayOf(schema.number()),
            comparator: schema.string(),
            aggType: schema.string(),
            metric: schema.string(),
            timeUnit: schema.string(),
            timeSize: schema.number(),
            indexPattern: schema.string(),
          })
        ),
        groupBy: schema.maybe(schema.string()),
        filterQuery: schema.maybe(schema.string()),
      }),
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS],
    async executor({ services, params }) {
      const { criteria, groupBy, filterQuery } = params as {
        criteria: MetricExpressionParams[];
        groupBy: string | undefined;
        filterQuery: string | undefined;
      };

      const alertResults = await Promise.all(
        criteria.map(criterion =>
          (async () => {
            const currentValues = await getMetric(services, criterion, groupBy, filterQuery);
            if (typeof currentValues === 'undefined')
              throw new Error('Could not get current value of metric');
            const { threshold, comparator } = criterion;
            const comparisonFunction = comparatorMap[comparator];

            return mapValues(currentValues, value => ({
              shouldFire: comparisonFunction(value, threshold),
              currentValue: value,
            }));
          })()
        )
      );

      const groups = Object.keys(alertResults[0]);
      for (const group of groups) {
        const alertInstance = services.alertInstanceFactory(`${alertUUID}-${group}`);

        const shouldAlertFire = alertResults.every(result => result[group].shouldFire);

        if (shouldAlertFire) {
          alertInstance.scheduleActions(FIRED_ACTIONS.id, {
            group,
            value: alertResults.map(result => result[group].currentValue),
          });
        }

        // Future use: ability to fetch display current alert state
        alertInstance.replaceState({
          alertState: shouldAlertFire ? AlertStates.ALERT : AlertStates.OK,
        });
      }
    },
  });
}
