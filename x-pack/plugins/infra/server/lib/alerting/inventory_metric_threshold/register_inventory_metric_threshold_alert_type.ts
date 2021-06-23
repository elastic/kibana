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
  createInventoryMetricThresholdExecutor,
  FIRED_ACTIONS,
  FIRED_ACTIONS_ID,
  WARNING_ACTIONS,
} from './inventory_metric_threshold_executor';
import { inventoryMetricThresholdAlertParamsSchema } from './schema';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from './types';

export const registerMetricInventoryThresholdAlertType = (libs: InfraBackendLibs) =>
  libs.metricsRules.createLifecycleRuleType({
    id: METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
    name: i18n.translate('xpack.infra.metrics.inventory.alertName', {
      defaultMessage: 'Inventory',
    }),
    validate: {
      params: inventoryMetricThresholdAlertParamsSchema,
    },
    defaultActionGroupId: FIRED_ACTIONS_ID,
    actionGroups: [FIRED_ACTIONS, WARNING_ACTIONS],
    producer: 'infrastructure',
    minimumLicenseRequired: 'basic',
    executor: createInventoryMetricThresholdExecutor(libs),
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
