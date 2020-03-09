/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../../triggers_actions_ui/public/types';
import { MetricExpression } from './expression';
import { validateExampleAlertType } from '../validation';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from '../../../../server/lib/alerting/metric_threshold/types';

export function getAlertType(): AlertTypeModel {
  return {
    id: METRIC_THRESHOLD_ALERT_TYPE_ID,
    name: 'Alert Trigger',
    iconClass: 'bell',
    alertParamsExpression: MetricExpression,
    validate: validateExampleAlertType,
  };
}
