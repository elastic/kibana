/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { MlPluginSetup } from '../../../../../ml/server';
import { AlertType, AlertInstanceState, AlertInstanceContext } from '../../../../../alerts/server';
import {
  createMetricAnomalyExecutor,
  FIRED_ACTIONS,
  FIRED_ACTIONS_ID,
} from './metric_anomaly_executor';
import { METRIC_ANOMALY_ALERT_TYPE_ID } from '../../../../common/alerting/metrics';
import { InfraBackendLibs } from '../../infra_types';
import { oneOfLiterals, validateIsStringElasticsearchJSONFilter } from '../common/utils';
import {
  groupActionVariableDescription,
  alertStateActionVariableDescription,
  reasonActionVariableDescription,
  timestampActionVariableDescription,
  valueActionVariableDescription,
  metricActionVariableDescription,
  thresholdActionVariableDescription,
} from '../common/messages';
import { RecoveredActionGroupId } from '../../../../../alerts/common';

export type MetricAnomalyAllowedActionGroups = typeof FIRED_ACTIONS_ID;

export const registerMetricAnomalyAlertType = (
  libs: InfraBackendLibs,
  ml?: MlPluginSetup
): AlertType<
  /**
   * TODO: Remove this use of `any` by utilizing a proper type
   */
  Record<string, any>,
  Record<string, any>,
  AlertInstanceState,
  AlertInstanceContext,
  MetricAnomalyAllowedActionGroups,
  RecoveredActionGroupId
> => ({
  id: METRIC_ANOMALY_ALERT_TYPE_ID,
  name: i18n.translate('xpack.infra.metrics.anomaly.alertName', {
    defaultMessage: 'Metric anomaly',
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
      },
      { unknowns: 'allow' }
    ),
  },
  defaultActionGroupId: FIRED_ACTIONS_ID,
  actionGroups: [FIRED_ACTIONS],
  producer: 'infrastructure',
  minimumLicenseRequired: 'basic',
  executor: createMetricAnomalyExecutor(libs, ml),
  actionVariables: {
    context: [
      { name: 'group', description: groupActionVariableDescription },
      { name: 'alertState', description: alertStateActionVariableDescription },
      { name: 'reason', description: reasonActionVariableDescription },
      { name: 'timestamp', description: timestampActionVariableDescription },
      { name: 'value', description: valueActionVariableDescription },
      { name: 'metric', description: metricActionVariableDescription },
      { name: 'threshold', description: thresholdActionVariableDescription },
    ],
  },
});
