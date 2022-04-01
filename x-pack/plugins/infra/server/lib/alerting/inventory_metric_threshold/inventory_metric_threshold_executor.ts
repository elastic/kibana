/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ALERT_REASON, ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import { first, get } from 'lodash';
import moment from 'moment';
import {
  ActionGroup,
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
  RecoveredActionGroup,
} from '../../../../../alerting/common';
import { Alert, AlertTypeState as RuleTypeState } from '../../../../../alerting/server';
import { AlertStates, InventoryMetricThresholdParams } from '../../../../common/alerting/metrics';
import { createFormatter } from '../../../../common/formatters';
import { getCustomMetricLabel } from '../../../../common/formatters/get_custom_metric_label';
import { METRIC_FORMATTERS } from '../../../../common/formatters/snapshot_metric_formats';
import { SnapshotMetricType } from '../../../../common/inventory_models/types';
import { toMetricOpt } from '../../../../common/snapshot_metric_i18n';
import { InfraBackendLibs } from '../../infra_types';
import { LogQueryFields } from '../../metrics/types';
import {
  buildErrorAlertReason,
  buildFiredAlertReason,
  buildInvalidQueryAlertReason,
  buildNoDataAlertReason,
  // buildRecoveredAlertReason,
  stateToAlertMessage,
} from '../common/messages';
import { createScopedLogger, getViewInAppUrlInventory } from '../common/utils';
import { evaluateCondition } from './evaluate_condition';

type InventoryMetricThresholdAllowedActionGroups = ActionGroupIdsOf<
  typeof FIRED_ACTIONS | typeof WARNING_ACTIONS
>;

export type InventoryMetricThresholdRuleTypeState = RuleTypeState; // no specific state used
export type InventoryMetricThresholdAlertState = AlertState; // no specific state used
export type InventoryMetricThresholdAlertContext = AlertContext; // no specific instance context used

type InventoryMetricThresholdAlert = Alert<
  InventoryMetricThresholdAlertState,
  InventoryMetricThresholdAlertContext,
  InventoryMetricThresholdAllowedActionGroups
>;
type InventoryMetricThresholdAlertFactory = (
  id: string,
  reason: string,
  threshold?: number | undefined,
  value?: number | undefined
) => InventoryMetricThresholdAlert;

export const createInventoryMetricThresholdExecutor = (libs: InfraBackendLibs) =>
  libs.metricsRules.createLifecycleRuleExecutor<
    InventoryMetricThresholdParams & Record<string, unknown>,
    InventoryMetricThresholdRuleTypeState,
    InventoryMetricThresholdAlertState,
    InventoryMetricThresholdAlertContext,
    InventoryMetricThresholdAllowedActionGroups
  >(async ({ services, params, alertId, executionId, startedAt }) => {
    const startTime = Date.now();
    const { criteria, filterQuery, sourceId = 'default', nodeType, alertOnNoData } = params;
    if (criteria.length === 0) throw new Error('Cannot execute an alert with 0 conditions');
    const logger = createScopedLogger(libs.logger, 'inventoryRule', { alertId, executionId });
    const { alertWithLifecycle, savedObjectsClient, getAlertStartedDate } = services;
    const alertFactory: InventoryMetricThresholdAlertFactory = (id, reason) =>
      alertWithLifecycle({
        id,
        fields: {
          [ALERT_REASON]: reason,
          [ALERT_RULE_PARAMETERS]: params as any, // the type assumes the object is already flattened when writing the same way as when reading https://github.com/elastic/kibana/blob/main/x-pack/plugins/rule_registry/common/field_map/runtime_type_from_fieldmap.ts#L60
        },
      });

    if (!params.filterQuery && params.filterQueryText) {
      try {
        const { fromKueryExpression } = await import('@kbn/es-query');
        fromKueryExpression(params.filterQueryText);
      } catch (e) {
        logger.error(e.message);
        const actionGroupId = FIRED_ACTIONS.id; // Change this to an Error action group when able
        const reason = buildInvalidQueryAlertReason(params.filterQueryText);
        const alert = alertFactory('*', reason);
        const indexedStartedDate = getAlertStartedDate('*') ?? startedAt.toISOString();
        const viewInAppUrl = getViewInAppUrlInventory(
          criteria,
          nodeType,
          indexedStartedDate,
          libs.basePath
        );
        alert.scheduleActions(actionGroupId, {
          group: '*',
          alertState: stateToAlertMessage[AlertStates.ERROR],
          reason,
          viewInAppUrl,
          timestamp: moment().toISOString(),
          value: null,
          metric: mapToConditionsLookup(criteria, (c) => c.metric),
        });
        return {};
      }
    }
    const source = await libs.sources.getSourceConfiguration(savedObjectsClient, sourceId);

    const [, , { logViews }] = await libs.getStartServices();
    const logQueryFields: LogQueryFields | undefined = await logViews
      .getClient(savedObjectsClient, services.scopedClusterClient.asCurrentUser)
      .getResolvedLogView(sourceId)
      .then(
        ({ indices }) => ({ indexPattern: indices }),
        () => undefined
      );

    const compositeSize = libs.configuration.alerting.inventory_threshold.group_by_page_size;
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
          logger,
        })
      )
    );
    let scheduledActionsCount = 0;
    const inventoryItems = Object.keys(first(results)!);
    for (const group of inventoryItems) {
      // AND logic; all criteria must be across the threshold
      const shouldAlertFire = results.every((result) => result[group]?.shouldFire);
      const shouldAlertWarn = results.every((result) => result[group]?.shouldWarn);
      // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
      // whole alert is in a No Data/Error state
      const isNoData = results.some((result) => result[group]?.isNoData);
      const isError = results.some((result) => result[group]?.isError);

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

        const alert = alertFactory(group, reason);
        const indexedStartedDate = getAlertStartedDate(group) ?? startedAt.toISOString();
        const viewInAppUrl = getViewInAppUrlInventory(
          criteria,
          nodeType,
          indexedStartedDate,
          libs.basePath
        );
        scheduledActionsCount++;
        alert.scheduleActions(
          /**
           * TODO: We're lying to the compiler here as explicitly  calling `scheduleActions` on
           * the RecoveredActionGroup isn't allowed
           */
          actionGroupId as unknown as InventoryMetricThresholdAllowedActionGroups,
          {
            group,
            alertState: stateToAlertMessage[nextState],
            reason,
            viewInAppUrl,
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
    const stopTime = Date.now();
    logger.debug(`Scheduled ${scheduledActionsCount} actions in ${stopTime - startTime}ms`);
  });

const formatThreshold = (metric: SnapshotMetricType, value: number) => {
  const metricFormatter = get(METRIC_FORMATTERS, metric, METRIC_FORMATTERS.count);
  const formatter = createFormatter(metricFormatter.formatter, metricFormatter.template);

  const threshold = Array.isArray(value)
    ? value.map((v: number) => {
        if (metricFormatter.formatter === 'percent') {
          v = Number(v) / 100;
        }
        if (metricFormatter.formatter === 'bits') {
          v = Number(v) / 8;
        }
        return formatter(v);
      })
    : value;
  return threshold;
};

const buildReasonWithVerboseMetricName = (
  group: string,
  resultItem: any,
  buildReason: (r: any) => string,
  useWarningThreshold?: boolean
) => {
  if (!resultItem) return '';

  const thresholdToFormat = useWarningThreshold
    ? resultItem.warningThreshold!
    : resultItem.threshold;
  const resultWithVerboseMetricName = {
    ...resultItem,
    group,
    metric:
      toMetricOpt(resultItem.metric)?.text ||
      (resultItem.metric === 'custom'
        ? getCustomMetricLabel(resultItem.customMetric)
        : resultItem.metric),
    currentValue: formatMetric(resultItem.metric, resultItem.currentValue),
    threshold: formatThreshold(resultItem.metric, thresholdToFormat),
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
