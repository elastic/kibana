/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mapValues, last, get } from 'lodash';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import {
  InfraDatabaseSearchResponse,
  CallWithRequestParams,
} from '../../adapters/framework/adapter_types';
import { Comparator, AlertStates, InventoryMetricConditions } from './types';
import { AlertServices, AlertExecutorOptions } from '../../../../../alerting/server';
import { InfraSnapshot } from '../../snapshot';
import { parseFilterQuery } from '../../../utils/serialized_query';
import { InventoryItemType, SnapshotMetricType } from '../../../../common/inventory_models/types';
import { InfraTimerangeInput } from '../../../../common/http_api/snapshot_api';
import { InfraSourceConfiguration } from '../../sources';
import { InfraBackendLibs } from '../../infra_types';
import { METRIC_FORMATTERS } from '../../../../common/formatters/snapshot_metric_formats';
import { createFormatter } from '../../../../common/formatters';

interface InventoryMetricThresholdParams {
  criteria: InventoryMetricConditions[];
  groupBy: string | undefined;
  filterQuery: string | undefined;
  nodeType: InventoryItemType;
  sourceId?: string;
}

export const createInventoryMetricThresholdExecutor = (
  libs: InfraBackendLibs,
  alertId: string
) => async ({ services, params }: AlertExecutorOptions) => {
  const { criteria, filterQuery, sourceId, nodeType } = params as InventoryMetricThresholdParams;

  const source = await libs.sources.getSourceConfiguration(
    services.savedObjectsClient,
    sourceId || 'default'
  );

  const results = await Promise.all(
    criteria.map(c => evaluateCondtion(c, nodeType, source.configuration, services, filterQuery))
  );

  const invenotryItems = Object.keys(results[0]);
  for (const item of invenotryItems) {
    const alertInstance = services.alertInstanceFactory(`${alertId}-${item}`);
    // AND logic; all criteria must be across the threshold
    const shouldAlertFire = results.every(result => result[item].shouldFire);

    // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
    // whole alert is in a No Data/Error state
    const isNoData = results.some(result => result[item].isNoData);
    const isError = results.some(result => result[item].isError);

    if (shouldAlertFire) {
      alertInstance.scheduleActions(FIRED_ACTIONS.id, {
        group: item,
        item,
        valueOf: mapToConditionsLookup(results, result =>
          formatMetric(result[item].metric, result[item].currentValue)
        ),
        thresholdOf: mapToConditionsLookup(criteria, c => c.threshold),
        metricOf: mapToConditionsLookup(criteria, c => c.metric),
      });
    }

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

interface ConditionResult {
  shouldFire: boolean;
  currentValue?: number | null;
  isNoData: boolean;
  isError: boolean;
}

const evaluateCondtion = async (
  condition: InventoryMetricConditions,
  nodeType: InventoryItemType,
  sourceConfiguration: InfraSourceConfiguration,
  services: AlertServices,
  filterQuery?: string
): Promise<Record<string, ConditionResult>> => {
  const { comparator, metric } = condition;
  let { threshold } = condition;

  const currentValues = await getData(
    services,
    nodeType,
    metric,
    {
      to: Date.now(),
      from: moment()
        .subtract(condition.timeSize, condition.timeUnit)
        .toDate()
        .getTime(),
      interval: condition.timeUnit,
    },
    sourceConfiguration,
    filterQuery
  );

  threshold = threshold.map(n => convertMetricValue(metric, n));

  const comparisonFunction = comparatorMap[comparator];

  return mapValues(currentValues, value => ({
    shouldFire: value !== undefined && value !== null && comparisonFunction(value, threshold),
    metric,
    currentValue: value,
    isNoData: value === null,
    isError: value === undefined,
  }));
};

const getData = async (
  services: AlertServices,
  nodeType: InventoryItemType,
  metric: SnapshotMetricType,
  timerange: InfraTimerangeInput,
  sourceConfiguration: InfraSourceConfiguration,
  filterQuery?: string
) => {
  const snapshot = new InfraSnapshot();
  const esClient = <Hit = {}, Aggregation = undefined>(
    options: CallWithRequestParams
  ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>> =>
    services.callCluster('search', options);

  const options = {
    filterQuery: parseFilterQuery(filterQuery),
    nodeType,
    groupBy: [],
    sourceConfiguration,
    metric: { type: metric },
    timerange,
  };

  const { nodes } = await snapshot.getNodes(esClient, options);

  return nodes.reduce((acc, n) => {
    const nodePathItem = last(n.path);
    acc[nodePathItem.label] = n.metric && n.metric.value;
    return acc;
  }, {} as Record<string, number | undefined | null>);
};

const comparatorMap = {
  [Comparator.BETWEEN]: (value: number, [a, b]: number[]) =>
    value >= Math.min(a, b) && value <= Math.max(a, b),
  // `threshold` is always an array of numbers in case the BETWEEN comparator is
  // used; all other compartors will just destructure the first value in the array
  [Comparator.GT]: (a: number, [b]: number[]) => a > b,
  [Comparator.LT]: (a: number, [b]: number[]) => a < b,
  [Comparator.OUTSIDE_RANGE]: (value: number, [a, b]: number[]) => value < a || value > b,
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

export const FIRED_ACTIONS = {
  id: 'metrics.invenotry_threshold.fired',
  name: i18n.translate('xpack.infra.metrics.alerting.inventory.threshold.fired', {
    defaultMessage: 'Fired',
  }),
};

// Some metrics in the UI are in a different unit that what we store in ES.
const convertMetricValue = (metric: SnapshotMetricType, value: number) => {
  if (converters[metric]) {
    return converters[metric](value);
  } else {
    return value;
  }
};
const converters: Record<string, (n: number) => number> = {
  cpu: n => Number(n) / 100,
  memory: n => Number(n) / 100,
};

const formatMetric = (metric: SnapshotMetricType, value: number) => {
  // if (SnapshotCustomMetricInputRT.is(metric)) {
  //   const formatter = createFormatterForMetric(metric);
  //   return formatter(val);
  // }
  const metricFormatter = get(METRIC_FORMATTERS, metric, METRIC_FORMATTERS.count);
  if (value == null) {
    return '';
  }
  const formatter = createFormatter(metricFormatter.formatter, metricFormatter.template);
  return formatter(value);
};
