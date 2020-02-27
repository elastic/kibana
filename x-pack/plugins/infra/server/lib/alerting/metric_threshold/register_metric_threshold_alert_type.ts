/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuid from 'uuid';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import {
  MetricThresholdAlertTypeParams,
  Comparator,
  AlertStates,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
} from './types';
import { AlertServices, PluginSetupContract } from '../../../../../alerting/server';

const FIRED_ACTIONS = {
  id: 'metrics.threshold.fired',
  name: i18n.translate('xpack.infra.metrics.alerting.threshold.fired', {
    defaultMessage: 'Fired',
  }),
};

async function getMetric(
  { callCluster }: AlertServices,
  { metric, aggType, timeUnit, timeSize, indexPattern }: MetricThresholdAlertTypeParams
) {
  const interval = `${timeSize}${timeUnit}`;
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
            exists: {
              field: metric,
            },
          },
        ],
      },
    },
    size: 0,
    aggs: {
      aggregatedIntervals: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: interval,
        },
        aggregations: {
          aggregatedValue: {
            [aggType]: {
              field: metric,
            },
          },
        },
      },
    },
  };

  const result = await callCluster('search', {
    body: searchBody,
    index: indexPattern,
  });

  const { buckets } = result.aggregations.aggregatedIntervals;
  const { value } = buckets[buckets.length - 1].aggregatedValue;
  return value;
}

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
        threshold: schema.arrayOf(schema.number()),
        comparator: schema.string(),
        aggType: schema.string(),
        metric: schema.string(),
        timeUnit: schema.string(),
        timeSize: schema.number(),
        indexPattern: schema.string(),
      }),
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS],
    async executor({ services, params }) {
      const { threshold, comparator } = params as MetricThresholdAlertTypeParams;
      const alertInstance = services.alertInstanceFactory(alertUUID);
      const currentValue = await getMetric(services, params as MetricThresholdAlertTypeParams);
      if (typeof currentValue === 'undefined')
        throw new Error('Could not get current value of metric');

      const comparisonFunction = comparatorMap[comparator];

      const isValueInAlertState = comparisonFunction(currentValue, threshold);

      if (isValueInAlertState) {
        alertInstance.scheduleActions(FIRED_ACTIONS.id, {
          value: currentValue,
        });
      }

      // Future use: ability to fetch display current alert state
      alertInstance.replaceState({
        alertState: isValueInAlertState ? AlertStates.ALERT : AlertStates.OK,
      });
    },
  });
}
