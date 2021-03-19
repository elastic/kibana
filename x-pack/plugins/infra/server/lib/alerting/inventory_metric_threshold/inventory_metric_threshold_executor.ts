/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first, get, last } from 'lodash';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { getCustomMetricLabel } from '../../../../common/formatters/get_custom_metric_label';
import { toMetricOpt } from '../../../../common/snapshot_metric_i18n';
import { AlertStates, InventoryMetricConditions } from './types';
import {
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  RecoveredActionGroup,
} from '../../../../../alerting/common';
import { AlertExecutorOptions } from '../../../../../alerting/server';
import { InventoryItemType, SnapshotMetricType } from '../../../../common/inventory_models/types';
import { InfraBackendLibs } from '../../infra_types';
import { METRIC_FORMATTERS } from '../../../../common/formatters/snapshot_metric_formats';
import { createFormatter } from '../../../../common/formatters';
import {
  buildErrorAlertReason,
  buildFiredAlertReason,
  buildNoDataAlertReason,
  // buildRecoveredAlertReason,
  stateToAlertMessage,
} from '../common/messages';
import { evaluateCondition } from './evaluate_condition';
import { InventoryMetricThresholdAllowedActionGroups } from './register_inventory_metric_threshold_alert_type';

interface InventoryMetricThresholdParams {
  criteria: InventoryMetricConditions[];
  filterQuery: string | undefined;
  nodeType: InventoryItemType;
  sourceId?: string;
  alertOnNoData?: boolean;
}

export const createInventoryMetricThresholdExecutor = (libs: InfraBackendLibs) => async ({
  services,
  params,
}: AlertExecutorOptions<
  /**
   * TODO: Remove this use of `any` by utilizing a proper type
   */
  Record<string, any>,
  Record<string, any>,
  AlertInstanceState,
  AlertInstanceContext,
  InventoryMetricThresholdAllowedActionGroups
>) => {
  const {
    criteria,
    filterQuery,
    sourceId,
    nodeType,
    alertOnNoData,
  } = params as InventoryMetricThresholdParams;

  if (criteria.length === 0) throw new Error('Cannot execute an alert with 0 conditions');

  const source = await libs.sources.getSourceConfiguration(
    services.savedObjectsClient,
    sourceId || 'default'
  );

  const results = await Promise.all(
    criteria.map((c) =>
      evaluateCondition(
        c,
        nodeType,
        source,
        services.scopedClusterClient.asCurrentUser,
        filterQuery
      )
    )
  );

  const inventoryItems = Object.keys(first(results)!);
  for (const item of inventoryItems) {
    // AND logic; all criteria must be across the threshold
    const shouldAlertFire = results.every((result) =>
      // Grab the result of the most recent bucket
      last(result[item].shouldFire)
    );
    const shouldAlertWarn = results.every((result) => last(result[item].shouldWarn));

    // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
    // whole alert is in a No Data/Error state
    const isNoData = results.some((result) => last(result[item].isNoData));
    const isError = results.some((result) => result[item].isError);

    const nextState = isError
      ? AlertStates.ERROR
      : isNoData
      ? AlertStates.NO_DATA
      : shouldAlertFire
      ? AlertStates.ALERT
      : shouldAlertWarn
      ? AlertStates.WARNING
      : AlertStates.OK;

    let reason;
    if (nextState === AlertStates.ALERT || nextState === AlertStates.WARNING) {
      reason = results
        .map((result) =>
          buildReasonWithVerboseMetricName(
            result[item],
            buildFiredAlertReason,
            nextState === AlertStates.WARNING
          )
        )
        .join('\n');
      /*
       * Custom recovery actions aren't yet available in the alerting framework
       * Uncomment the code below once they've been implemented
       * Reference: https://github.com/elastic/kibana/issues/87048
       */
      // } else if (nextState === AlertStates.OK && prevState?.alertState === AlertStates.ALERT) {
      // reason = results
      //   .map((result) => buildReasonWithVerboseMetricName(result[item], buildRecoveredAlertReason))
      //   .join('\n');
    }
    if (alertOnNoData) {
      if (nextState === AlertStates.NO_DATA) {
        reason = results
          .filter((result) => result[item].isNoData)
          .map((result) => buildReasonWithVerboseMetricName(result[item], buildNoDataAlertReason))
          .join('\n');
      } else if (nextState === AlertStates.ERROR) {
        reason = results
          .filter((result) => result[item].isError)
          .map((result) => buildReasonWithVerboseMetricName(result[item], buildErrorAlertReason))
          .join('\n');
      }
    }
    if (reason) {
      const actionGroupId =
        nextState === AlertStates.OK
          ? RecoveredActionGroup.id
          : nextState === AlertStates.WARNING
          ? WARNING_ACTIONS.id
          : FIRED_ACTIONS.id;
      const alertInstance = services.alertInstanceFactory(`${item}`);
      alertInstance.scheduleActions(
        /**
         * TODO: We're lying to the compiler here as explicitly  calling `scheduleActions` on
         * the RecoveredActionGroup isn't allowed
         */
        (actionGroupId as unknown) as InventoryMetricThresholdAllowedActionGroups,
        {
          group: item,
          alertState: stateToAlertMessage[nextState],
          reason,
          timestamp: moment().toISOString(),
          value: mapToConditionsLookup(results, (result) =>
            formatMetric(result[item].metric, result[item].currentValue)
          ),
          threshold: mapToConditionsLookup(criteria, (c) => c.threshold),
          metric: mapToConditionsLookup(criteria, (c) => c.metric),
        }
      );
    }
  }
};

const buildReasonWithVerboseMetricName = (
  resultItem: any,
  buildReason: (r: any) => string,
  useWarningThreshold?: boolean
) => {
  if (!resultItem) return '';
  const resultWithVerboseMetricName = {
    ...resultItem,
    metric:
      toMetricOpt(resultItem.metric)?.text ||
      (resultItem.metric === 'custom'
        ? getCustomMetricLabel(resultItem.customMetric)
        : resultItem.metric),
    currentValue: formatMetric(resultItem.metric, resultItem.currentValue),
    threshold: useWarningThreshold ? resultItem.warningThreshold! : resultItem.threshold,
    comparator: useWarningThreshold ? resultItem.warningComparator! : resultItem.comparator,
  };
  return buildReason(resultWithVerboseMetricName);
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

export const FIRED_ACTIONS_ID = 'metrics.inventory_threshold.fired';
export const FIRED_ACTIONS: ActionGroup<typeof FIRED_ACTIONS_ID> = {
  id: FIRED_ACTIONS_ID,
  name: i18n.translate('xpack.infra.metrics.alerting.inventory.threshold.fired', {
    defaultMessage: 'Alert',
  }),
};
export const WARNING_ACTIONS_ID = 'metrics.inventory_threshold.warning';
export const WARNING_ACTIONS = {
  id: WARNING_ACTIONS_ID,
  name: i18n.translate('xpack.infra.metrics.alerting.threshold.warning', {
    defaultMessage: 'Warning',
  }),
};

const formatMetric = (metric: SnapshotMetricType, value: number) => {
  const metricFormatter = get(METRIC_FORMATTERS, metric, METRIC_FORMATTERS.count);
  if (isNaN(value)) {
    return i18n.translate('xpack.infra.metrics.alerting.inventory.noDataFormattedValue', {
      defaultMessage: '[NO DATA]',
    });
  }
  const formatter = createFormatter(metricFormatter.formatter, metricFormatter.template);
  return formatter(value);
};
