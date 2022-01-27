/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRequest } from 'kibana/server';
import { first } from 'lodash';
import moment from 'moment';
import {
  ActionGroup,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
} from '../../../../../alerting/common';
import { AlertExecutorOptions as RuleExecutorOptions } from '../../../../../alerting/server';
import { MlPluginSetup } from '../../../../../ml/server';
import { AlertStates, MetricAnomalyParams } from '../../../../common/alerting/metrics';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { MappedAnomalyHit } from '../../infra_ml';
import { InfraBackendLibs } from '../../infra_types';
import { stateToAlertMessage } from '../common/messages';
import { evaluateCondition } from './evaluate_condition';
import { MetricAnomalyAllowedActionGroups } from './register_metric_anomaly_rule_type';

export const createMetricAnomalyExecutor =
  (_libs: InfraBackendLibs, ml?: MlPluginSetup) =>
  async ({
    services,
    params,
    startedAt,
  }: RuleExecutorOptions<
    /**
     * TODO: Remove this use of `any` by utilizing a proper type
     */
    Record<string, any>,
    Record<string, any>,
    AlertState,
    AlertContext,
    MetricAnomalyAllowedActionGroups
  >) => {
    if (!ml) {
      return;
    }
    const request = {} as KibanaRequest;
    const mlSystem = ml.mlSystemProvider(request, services.savedObjectsClient);
    const mlAnomalyDetectors = ml.anomalyDetectorsProvider(request, services.savedObjectsClient);

    const { metric, alertInterval, influencerFilter, sourceId, spaceId, nodeType, threshold } =
      params as MetricAnomalyParams;

    const bucketInterval = getIntervalInSeconds('15m') * 1000;
    const alertIntervalInMs = getIntervalInSeconds(alertInterval ?? '1m') * 1000;

    const endTime = startedAt.getTime();
    // Anomalies are bucketed at :00, :15, :30, :45 minutes every hour
    const previousBucketStartTime = endTime - (endTime % bucketInterval);

    // If the alert interval is less than 15m, make sure that it actually queries an anomaly bucket
    const startTime = Math.min(endTime - alertIntervalInMs, previousBucketStartTime);

    const { data } = await evaluateCondition({
      sourceId: sourceId ?? 'default',
      spaceId: spaceId ?? 'default',
      mlSystem,
      mlAnomalyDetectors,
      startTime,
      endTime,
      metric,
      threshold,
      nodeType,
      influencerFilter,
    });

    const shouldAlertFire = data.length > 0;

    if (shouldAlertFire) {
      const {
        startTime: anomalyStartTime,
        anomalyScore,
        actual,
        typical,
        influencers,
      } = first(data as MappedAnomalyHit[])!;
      const alert = services.alertFactory.create(`${nodeType}-${metric}`);

      alert.scheduleActions(FIRED_ACTIONS_ID, {
        alertState: stateToAlertMessage[AlertStates.ALERT],
        timestamp: moment(anomalyStartTime).toISOString(),
        anomalyScore,
        actual,
        typical,
        metric: metricNameMap[metric],
        summary: generateSummaryMessage(actual, typical),
        influencers: influencers.join(', '),
      });
    }
  };

export const FIRED_ACTIONS_ID = 'metrics.anomaly.fired';
export const FIRED_ACTIONS: ActionGroup<typeof FIRED_ACTIONS_ID> = {
  id: FIRED_ACTIONS_ID,
  name: i18n.translate('xpack.infra.metrics.alerting.anomaly.fired', {
    defaultMessage: 'Fired',
  }),
};

const generateSummaryMessage = (actual: number, typical: number) => {
  const differential = (Math.max(actual, typical) / Math.min(actual, typical))
    .toFixed(1)
    .replace('.0', '');
  if (actual > typical) {
    return i18n.translate('xpack.infra.metrics.alerting.anomaly.summaryHigher', {
      defaultMessage: '{differential}x higher',
      values: {
        differential,
      },
    });
  } else {
    return i18n.translate('xpack.infra.metrics.alerting.anomaly.summaryLower', {
      defaultMessage: '{differential}x lower',
      values: {
        differential,
      },
    });
  }
};

const metricNameMap = {
  memory_usage: i18n.translate('xpack.infra.metrics.alerting.anomaly.memoryUsage', {
    defaultMessage: 'Memory usage',
  }),
  network_in: i18n.translate('xpack.infra.metrics.alerting.anomaly.networkIn', {
    defaultMessage: 'Network in',
  }),
  network_out: i18n.translate('xpack.infra.metrics.alerting.anomaly.networkOut', {
    defaultMessage: 'Network out',
  }),
};
