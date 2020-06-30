/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { first, get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { AlertStates, InventoryMetricConditions } from './types';
import { AlertExecutorOptions } from '../../../../../alerts/server';
import { InventoryItemType, SnapshotMetricType } from '../../../../common/inventory_models/types';
import { InfraBackendLibs } from '../../infra_types';
import { METRIC_FORMATTERS } from '../../../../common/formatters/snapshot_metric_formats';
import { createFormatter } from '../../../../common/formatters';
import { evaluateCondition } from './evaluate_condition';

interface InventoryMetricThresholdParams {
  criteria: InventoryMetricConditions[];
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
    criteria.map((c) =>
      evaluateCondition(c, nodeType, source.configuration, services.callCluster, filterQuery)
    )
  );

  const inventoryItems = Object.keys(first(results));
  for (const item of inventoryItems) {
    const alertInstance = services.alertInstanceFactory(`${alertId}-${item}`);
    // AND logic; all criteria must be across the threshold
    const shouldAlertFire = results.every((result) => result[item].shouldFire);

    // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
    // whole alert is in a No Data/Error state
    const isNoData = results.some((result) => result[item].isNoData);
    const isError = results.some((result) => result[item].isError);

    if (shouldAlertFire) {
      alertInstance.scheduleActions(FIRED_ACTIONS.id, {
        group: item,
        item,
        valueOf: mapToConditionsLookup(results, (result) =>
          formatMetric(result[item].metric, result[item].currentValue)
        ),
        thresholdOf: mapToConditionsLookup(criteria, (c) => c.threshold),
        metricOf: mapToConditionsLookup(criteria, (c) => c.metric),
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
