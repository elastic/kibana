/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from '../../../server/lib/alerting/inventory_metric_threshold/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../triggers_actions_ui/public/types';
import { validateMetricThreshold } from './components/validation';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths

export function createInventoryMetricAlertType(): AlertTypeModel {
  return {
    id: METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
    name: i18n.translate('xpack.infra.metrics.inventory.alertFlyout.alertName', {
      defaultMessage: 'Inventory',
    }),
    iconClass: 'bell',
    alertParamsExpression: React.lazy(() => import('./components/expression')),
    validate: validateMetricThreshold,
    defaultActionMessage: i18n.translate(
      'xpack.infra.metrics.alerting.inventory.threshold.defaultActionMessage',
      {
        defaultMessage: `\\{\\{alertName\\}\\} - \\{\\{context.group\\}\\}

\\{\\{context.metricOf.condition0\\}\\} has crossed a threshold of \\{\\{context.thresholdOf.condition0\\}\\}
Current value is \\{\\{context.valueOf.condition0\\}\\}
`,
      }
    ),
    requiresAppContext: false,
  };
}
