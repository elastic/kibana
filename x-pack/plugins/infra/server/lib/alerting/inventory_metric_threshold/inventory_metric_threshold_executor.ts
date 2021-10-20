/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first, get, last } from 'lodash';
import { i18n } from '@kbn/i18n';
import { ALERT_REASON, ALERT_RULE_PARAMS } from '@kbn/rule-data-utils';
import moment from 'moment';
import { getCustomMetricLabel } from '../../../../common/formatters/get_custom_metric_label';
import { toMetricOpt } from '../../../../common/snapshot_metric_i18n';
import { AlertStates } from './types';
import {
  ActionGroupIdsOf,
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  RecoveredActionGroup,
} from '../../../../../alerting/common';
import { AlertInstance, AlertTypeState } from '../../../../../alerting/server';
import { SnapshotMetricType } from '../../../../common/inventory_models/types';
import { InfraBackendLibs } from '../../infra_types';
import { METRIC_FORMATTERS } from '../../../../common/formatters/snapshot_metric_formats';
import { createFormatter } from '../../../../common/formatters';
import { InventoryMetricThresholdParams } from '../../../../common/alerting/metrics';
import {
  buildErrorAlertReason,
  buildFiredAlertReason,
  buildNoDataAlertReason,
  // buildRecoveredAlertReason,
  stateToAlertMessage,
} from '../common/messages';
import { evaluateCondition } from './evaluate_condition';

type InventoryMetricThresholdAllowedActionGroups = ActionGroupIdsOf<
  typeof FIRED_ACTIONS | typeof WARNING_ACTIONS
>;

export type InventoryMetricThresholdAlertTypeState = AlertTypeState; // no specific state used
export type InventoryMetricThresholdAlertInstanceState = AlertInstanceState; // no specific state used
export type InventoryMetricThresholdAlertInstanceContext = AlertInstanceContext; // no specific instance context used

type InventoryMetricThresholdAlertInstance = AlertInstance<
  InventoryMetricThresholdAlertInstanceState,
  InventoryMetricThresholdAlertInstanceContext,
  InventoryMetricThresholdAllowedActionGroups
>;
type InventoryMetricThresholdAlertInstanceFactory = (
  id: string,
  reason: string,
  threshold?: number | undefined,
  value?: number | undefined
) => InventoryMetricThresholdAlertInstance;

export const createInventoryMetricThresholdExecutor = (libs: InfraBackendLibs) =>
  libs.metricsRules.createLifecycleRuleExecutor<
    InventoryMetricThresholdParams & Record<string, unknown>,
    InventoryMetricThresholdAlertTypeState,
    InventoryMetricThresholdAlertInstanceState,
    InventoryMetricThresholdAlertInstanceContext,
    InventoryMetricThresholdAllowedActionGroups
  >(async ({ services, params }) => {
    const { criteria, filterQuery, sourceId, nodeType, alertOnNoData } = params;
    if (criteria.length === 0) throw new Error('Cannot execute an alert with 0 conditions');
    const { alertWithLifecycle, savedObjectsClient } = services;
    const alertInstanceFactory: InventoryMetricThresholdAlertInstanceFactory = (id, reason) =>
      alertWithLifecycle({
        id,
        fields: {
          [ALERT_REASON]: reason,
          [ALERT_RULE_PARAMS]: JSON.stringify(params),
        },
      });

    const source = await libs.sources.getSourceConfiguration(
      savedObjectsClient,
      sourceId || 'default'
    );

    const logQueryFields = await libs
      .getLogQueryFields(
        sourceId || 'default',
        services.savedObjectsClient,
        services.scopedClusterClient.asCurrentUser
      )
      .catch(() => undefined);

    const compositeSize = libs.configuration.inventory.compositeSize;
    const results = await Promise.all(
      criteria.map((condition) =>
        evaluateCondition({
          condition,
          nodeType,
          source,
          logQueryFields,
          esClient: services.scopedClusterClient.asCurrentUser,
          compositeSize,
          filterQuery,
        })
      )
    );
    const inventoryItems = Object.keys(first(results)!);
    for (const group of inventoryItems) {
      // AND logic; all criteria must be across the threshold
      const shouldAlertFire = results.every((result) => {
        // Grab the result of the most recent bucket
        return last(result[group].shouldFire);
      });
      const shouldAlertWarn = results.every((result) => last(result[group].shouldWarn));

      // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
      // whole alert is in a No Data/Error state
      const isNoData = results.some((result) => last(result[group].isNoData));
      const isError = results.some((result) => result[group].isError);

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
              group,
              result[group],
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
        //   .map((result) => buildReasonWithVerboseMetricName(group, result[group], buildRecoveredAlertReason))
        //   .join('\n');
      }
      if (alertOnNoData) {
        if (nextState === AlertStates.NO_DATA) {
          reason = results
            .filter((result) => result[group].isNoData)
            .map((result) =>
              buildReasonWithVerboseMetricName(group, result[group], buildNoDataAlertReason)
            )
            .join('\n');
        } else if (nextState === AlertStates.ERROR) {
          reason = results
            .filter((result) => result[group].isError)
            .map((result) =>
              buildReasonWithVerboseMetricName(group, result[group], buildErrorAlertReason)
            )
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

        const alertInstance = alertInstanceFactory(`${group}`, reason);
        alertInstance.scheduleActions(
          /**
           * TODO: We're lying to the compiler here as explicitly  calling `scheduleActions` on
           * the RecoveredActionGroup isn't allowed
           */
          actionGroupId as unknown as InventoryMetricThresholdAllowedActionGroups,
          {
            group,
            alertState: stateToAlertMessage[nextState],
            reason,
            timestamp: moment().toISOString(),
            value: mapToConditionsLookup(results, (result) =>
              formatMetric(result[group].metric, result[group].currentValue)
            ),
            threshold: mapToConditionsLookup(criteria, (c) => c.threshold),
            metric: mapToConditionsLookup(criteria, (c) => c.metric),
          }
        );
      }
    }
  });

const buildReasonWithVerboseMetricName = (
  group: string,
  resultItem: any,
  buildReason: (r: any) => string,
  useWarningThreshold?: boolean
) => {
  if (!resultItem) return '';
  const resultWithVerboseMetricName = {
    ...resultItem,
    group,
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
