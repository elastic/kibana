/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { MlPluginSetup } from '../../../../../ml/server';
import {
  RuleType,
  AlertInstanceState as AlertState,
  AlertInstanceContext as AlertContext,
} from '../../../../../alerting/server';
import {
  createMetricAnomalyExecutor,
  FIRED_ACTIONS,
  FIRED_ACTIONS_ID,
} from './metric_anomaly_executor';
import { METRIC_ANOMALY_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import { InfraBackendLibs } from '../../infra_types';
import { oneOfLiterals, validateIsStringElasticsearchJSONFilter } from '../common/utils';
import { alertStateActionVariableDescription } from '../common/messages';
import { RecoveredActionGroupId } from '../../../../../alerting/common';

export type MetricAnomalyAllowedActionGroups = typeof FIRED_ACTIONS_ID;

export const registerMetricAnomalyRuleType = (
  libs: InfraBackendLibs,
  ml?: MlPluginSetup
): RuleType<
  /**
   * TODO: Remove this use of `any` by utilizing a proper type
   */
  Record<string, any>,
  never, // Only use if defining useSavedObjectReferences hook
  Record<string, any>,
  AlertState,
  AlertContext,
  MetricAnomalyAllowedActionGroups,
  RecoveredActionGroupId
> => ({
  id: METRIC_ANOMALY_ALERT_TYPE_ID,
  name: i18n.translate('xpack.infra.metrics.anomaly.alertName', {
    defaultMessage: 'Infrastructure anomaly',
  }),
  validate: {
    params: schema.object(
      {
        nodeType: oneOfLiterals(['hosts', 'k8s']),
        alertInterval: schema.string(),
        metric: oneOfLiterals(['memory_usage', 'network_in', 'network_out']),
        threshold: schema.number(),
        filterQuery: schema.maybe(
          schema.string({ validate: validateIsStringElasticsearchJSONFilter })
        ),
        sourceId: schema.string(),
        spaceId: schema.string(),
      },
      { unknowns: 'allow' }
    ),
  },
  defaultActionGroupId: FIRED_ACTIONS_ID,
  actionGroups: [FIRED_ACTIONS],
  producer: 'infrastructure',
  minimumLicenseRequired: 'basic',
  isExportable: true,
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
        description: i18n.translate('xpack.infra.metrics.alerting.anomalyInfluencersDescription', {
          defaultMessage: 'A list of node names that influenced the anomaly.',
        }),
      },
    ],
  },
});
