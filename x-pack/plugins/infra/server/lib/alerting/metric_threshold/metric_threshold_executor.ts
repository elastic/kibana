/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first, last } from 'lodash';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { RecoveredActionGroup } from '../../../../../alerts/common';
import { InfraBackendLibs } from '../../infra_types';
import {
  buildErrorAlertReason,
  buildFiredAlertReason,
  buildNoDataAlertReason,
  // buildRecoveredAlertReason,
  stateToAlertMessage,
} from '../common/messages';
import { createFormatter } from '../../../../common/formatters';
import { AlertStates, Comparator } from './types';
import { evaluateAlert, EvaluatedAlertParams } from './lib/evaluate_alert';
import {
  MetricThresholdAlertExecutorOptions,
  MetricThresholdAlertType,
} from './register_metric_threshold_alert_type';

export const createMetricThresholdExecutor = (
  libs: InfraBackendLibs
): MetricThresholdAlertType['executor'] =>
  async function (options: MetricThresholdAlertExecutorOptions) {
    const { services, params } = options;
    const { criteria } = params;
    if (criteria.length === 0) throw new Error('Cannot execute an alert with 0 conditions');

    const { sourceId, alertOnNoData } = params as {
      sourceId?: string;
      alertOnNoData: boolean;
    };

    const source = await libs.sources.getSourceConfiguration(
      services.savedObjectsClient,
      sourceId || 'default'
    );
    const config = source.configuration;
    const alertResults = await evaluateAlert(
      services.callCluster,
      params as EvaluatedAlertParams,
      config
    );

    // Because each alert result has the same group definitions, just grab the groups from the first one.
    const groups = Object.keys(first(alertResults)!);
    for (const group of groups) {
      // AND logic; all criteria must be across the threshold
      const shouldAlertFire = alertResults.every((result) =>
        // Grab the result of the most recent bucket
        last(result[group].shouldFire)
      );
      const shouldAlertWarn = alertResults.every((result) => last(result[group].shouldWarn));
      // AND logic; because we need to evaluate all criteria, if one of them reports no data then the
      // whole alert is in a No Data/Error state
      const isNoData = alertResults.some((result) => last(result[group].isNoData));
      const isError = alertResults.some((result) => result[group].isError);

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
        reason = alertResults
          .map((result) =>
            buildFiredAlertReason(
              formatAlertResult(result[group], nextState === AlertStates.WARNING)
            )
          )
          .join('\n');
        /*
         * Custom recovery actions aren't yet available in the alerting framework
         * Uncomment the code below once they've been implemented
         * Reference: https://github.com/elastic/kibana/issues/87048
         */
        // } else if (nextState === AlertStates.OK && prevState?.alertState === AlertStates.ALERT) {
        // reason = alertResults
        //   .map((result) => buildRecoveredAlertReason(formatAlertResult(result[group])))
        //   .join('\n');
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
        const firstResult = first(alertResults);
        const timestamp = (firstResult && firstResult[group].timestamp) ?? moment().toISOString();
        const actionGroupId =
          nextState === AlertStates.OK
            ? RecoveredActionGroup.id
            : nextState === AlertStates.WARNING
            ? WARNING_ACTIONS.id
            : FIRED_ACTIONS.id;
        const alertInstance = services.alertInstanceFactory(`${group}`);

        alertInstance.scheduleActions(actionGroupId, {
          group,
          alertState: stateToAlertMessage[nextState],
          reason,
          timestamp,
          value: mapToConditionsLookup(
            alertResults,
            (result) => formatAlertResult(result[group]).currentValue
          ),
          threshold: mapToConditionsLookup(
            alertResults,
            (result) => formatAlertResult(result[group]).threshold
          ),
          metric: mapToConditionsLookup(criteria, (c) => c.metric),
        });
      }
    }
  };

export const FIRED_ACTIONS = {
  id: 'metrics.threshold.fired',
  name: i18n.translate('xpack.infra.metrics.alerting.threshold.fired', {
    defaultMessage: 'Alert',
  }),
};

export const WARNING_ACTIONS = {
  id: 'metrics.threshold.warning',
  name: i18n.translate('xpack.infra.metrics.alerting.threshold.warning', {
    defaultMessage: 'Warning',
  }),
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

const formatAlertResult = <AlertResult>(
  alertResult: {
    metric: string;
    currentValue: number;
    threshold: number[];
    comparator: Comparator;
    warningThreshold?: number[];
    warningComparator?: Comparator;
  } & AlertResult,
  useWarningThreshold?: boolean
) => {
  const {
    metric,
    currentValue,
    threshold,
    comparator,
    warningThreshold,
    warningComparator,
  } = alertResult;
  const noDataValue = i18n.translate(
    'xpack.infra.metrics.alerting.threshold.noDataFormattedValue',
    {
      defaultMessage: '[NO DATA]',
    }
  );
  if (!metric.endsWith('.pct'))
    return {
      ...alertResult,
      currentValue: currentValue ?? noDataValue,
    };
  const formatter = createFormatter('percent');
  const thresholdToFormat = useWarningThreshold ? warningThreshold! : threshold;
  const comparatorToFormat = useWarningThreshold ? warningComparator! : comparator;
  return {
    ...alertResult,
    currentValue:
      currentValue !== null && typeof currentValue !== 'undefined'
        ? formatter(currentValue)
        : noDataValue,
    threshold: Array.isArray(thresholdToFormat)
      ? thresholdToFormat.map((v: number) => formatter(v))
      : thresholdToFormat,
    comparator: comparatorToFormat,
  };
};
