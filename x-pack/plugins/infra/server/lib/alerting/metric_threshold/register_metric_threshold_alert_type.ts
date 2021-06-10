/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { InfraBackendLibs } from '../../infra_types';
import {
  alertStateActionVariableDescription,
  groupActionVariableDescription,
  metricActionVariableDescription,
  reasonActionVariableDescription,
  thresholdActionVariableDescription,
  timestampActionVariableDescription,
  valueActionVariableDescription,
} from '../common/messages';
import {
  createMetricThresholdExecutor,
  FIRED_ACTIONS,
  WARNING_ACTIONS,
} from './metric_threshold_executor';
import { metricThresholdAlertParamsValidator } from './schema';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from './types';

export function registerMetricThresholdAlertType(libs: InfraBackendLibs) {
  return libs.metricsRules.createLifecycleRuleType({
    id: METRIC_THRESHOLD_ALERT_TYPE_ID,
    name: i18n.translate('xpack.infra.metrics.alertName', {
      defaultMessage: 'Metric threshold',
    }),
    validate: {
      params: metricThresholdAlertParamsValidator,
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS, WARNING_ACTIONS],
    minimumLicenseRequired: 'basic',
    executor: createMetricThresholdExecutor(libs),
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
    producer: 'infrastructure',
  });
}
