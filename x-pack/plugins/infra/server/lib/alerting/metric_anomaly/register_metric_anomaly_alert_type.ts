/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MlPluginSetup } from '../../../../../ml/server';
import { METRIC_ANOMALY_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import { InfraBackendLibs } from '../../infra_types';
import { alertStateActionVariableDescription } from '../common/messages';
import {
  createMetricAnomalyExecutor,
  FIRED_ACTIONS,
  FIRED_ACTIONS_ID,
} from './metric_anomaly_executor';
import { metricAnomalyAlertTypeParamsSchema } from './schema';

export const registerMetricAnomalyAlertType = (libs: InfraBackendLibs, ml?: MlPluginSetup) =>
  libs.metricsRules.createLifecycleRuleType({
    id: METRIC_ANOMALY_ALERT_TYPE_ID,
    name: i18n.translate('xpack.infra.metrics.anomaly.alertName', {
      defaultMessage: 'Infrastructure anomaly',
    }),
    validate: {
      params: metricAnomalyAlertTypeParamsSchema,
    },
    defaultActionGroupId: FIRED_ACTIONS_ID,
    actionGroups: [FIRED_ACTIONS],
    producer: 'infrastructure',
    minimumLicenseRequired: 'basic',
    executor: createMetricAnomalyExecutor(libs, ml),
    actionVariables: {
      context: [
        { name: 'alertState', description: alertStateActionVariableDescription },
        {
          name: 'metric',
          description: i18n.translate('xpack.infra.metrics.alerting.anomalyMetricDescription', {
            defaultMessage: 'The metric name in the specified condition.',
          }),
        },
        {
          name: 'timestamp',
          description: i18n.translate('xpack.infra.metrics.alerting.anomalyTimestampDescription', {
            defaultMessage: 'A timestamp of when the anomaly was detected.',
          }),
        },
        {
          name: 'anomalyScore',
          description: i18n.translate('xpack.infra.metrics.alerting.anomalyScoreDescription', {
            defaultMessage: 'The exact severity score of the detected anomaly.',
          }),
        },
        {
          name: 'actual',
          description: i18n.translate('xpack.infra.metrics.alerting.anomalyActualDescription', {
            defaultMessage: 'The actual value of the monitored metric at the time of the anomaly.',
          }),
        },
        {
          name: 'typical',
          description: i18n.translate('xpack.infra.metrics.alerting.anomalyTypicalDescription', {
            defaultMessage: 'The typical value of the monitored metric at the time of the anomaly.',
          }),
        },
        {
          name: 'summary',
          description: i18n.translate('xpack.infra.metrics.alerting.anomalySummaryDescription', {
            defaultMessage: 'A description of the anomaly, e.g. "2x higher."',
          }),
        },
        {
          name: 'influencers',
          description: i18n.translate(
            'xpack.infra.metrics.alerting.anomalyInfluencersDescription',
            {
              defaultMessage: 'A list of node names that influenced the anomaly.',
            }
          ),
        },
      ],
    },
  });
