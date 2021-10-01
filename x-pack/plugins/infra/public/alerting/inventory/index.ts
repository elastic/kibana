/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  InventoryMetricConditions,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../server/lib/alerting/inventory_metric_threshold/types';

import { ObservabilityRuleTypeModel } from '../../../../observability/public';

import { AlertTypeParams } from '../../../../alerting/common';
import { validateMetricThreshold } from './components/validation';
import { formatReason } from './rule_data_formatters';

interface InventoryMetricAlertTypeParams extends AlertTypeParams {
  criteria: InventoryMetricConditions[];
}

export function createInventoryMetricAlertType(): ObservabilityRuleTypeModel<InventoryMetricAlertTypeParams> {
  return {
    id: METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
    description: i18n.translate('xpack.infra.metrics.inventory.alertFlyout.alertDescription', {
      defaultMessage: 'Alert when the inventory exceeds a defined threshold.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.observability.infrastructureThreshold}`;
    },
    alertParamsExpression: React.lazy(() => import('./components/expression')),
    validate: validateMetricThreshold,
    defaultActionMessage: i18n.translate(
      'xpack.infra.metrics.alerting.inventory.threshold.defaultActionMessage',
      {
        defaultMessage: `\\{\\{alertName\\}\\} - \\{\\{context.group\\}\\} is in a state of \\{\\{context.alertState\\}\\}

Reason:
\\{\\{context.reason\\}\\}
`,
      }
    ),
    requiresAppContext: false,
    format: formatReason,
  };
}
