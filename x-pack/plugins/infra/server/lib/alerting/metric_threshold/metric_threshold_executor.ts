/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { first, last } from 'lodash';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { AlertExecutorOptions } from '../../../../../alerts/server';
import { InfraBackendLibs } from '../../infra_types';
import {
  buildErrorAlertReason,
  buildFiredAlertReason,
  buildNoDataAlertReason,
  stateToAlertMessage,
} from '../common/messages';
import { createFormatter } from '../../../../common/formatters';
import { AlertStates } from './types';
import { evaluateAlert } from './lib/evaluate_alert';

export const createMetricThresholdExecutor = (libs: InfraBackendLibs) =>
  async function (options: AlertExecutorOptions) {
    const { services, params } = options;
    const { criteria } = params;
    const { sourceId, alertOnNoData } = params as {
      sourceId?: string;
      alertOnNoData: boolean;
    };

    const source = await libs.sources.getSourceConfiguration(
      services.savedObjectsClient,
      sourceId || 'default'
    );
    const config = source.configuration;
    const alertResults = await evaluateAlert(services.callCluster, params, config);

    // Because each alert result has the same group definitions, just grap the groups from the first one.
    const groups = Object.keys(first(alertResults) as any);
    for (const group of groups) {
      const alertInstance = services.alertInstanceFactory(`${group}`);

      // AND logic; all criteria must be across the threshold
      const shouldAlertFire = alertResults.every((result) =>
        // Grab the result of the most recent bucket
        last(result[group].shouldFire)
      );
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
        : AlertStates.OK;

      let reason;
      if (nextState === AlertStates.ALERT) {
        reason = alertResults
          .map((result) => buildFiredAlertReason(formatAlertResult(result[group]) as any))
          .join('\n');
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
        alertInstance.scheduleActions(FIRED_ACTIONS.id, {
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

const formatAlertResult = (alertResult: {
  metric: string;
  currentValue: number;
  threshold: number[];
}) => {
  const { metric, currentValue, threshold } = alertResult;
  if (!metric.endsWith('.pct')) return alertResult;
  const formatter = createFormatter('percent');
  return {
    ...alertResult,
    currentValue: formatter(currentValue),
    threshold: Array.isArray(threshold) ? threshold.map((v: number) => formatter(v)) : threshold,
  };
};
