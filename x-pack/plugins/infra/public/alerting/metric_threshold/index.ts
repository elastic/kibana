/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { RuleTypeParams } from '../../../../alerting/common';
import { ObservabilityRuleTypeModel } from '../../../../observability/public';
import {
  MetricExpressionParams,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
} from '../../../common/alerting/metrics';
import { validateMetricThreshold } from './components/validation';
import { formatReason } from './rule_data_formatters';

interface MetricThresholdRuleTypeParams extends RuleTypeParams {
  criteria: MetricExpressionParams[];
}

export function createMetricThresholdRuleType(): ObservabilityRuleTypeModel<MetricThresholdRuleTypeParams> {
  return {
    id: METRIC_THRESHOLD_ALERT_TYPE_ID,
    description: i18n.translate('xpack.infra.metrics.alertFlyout.alertDescription', {
      defaultMessage: 'Alert when the metrics aggregation exceeds the threshold.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.observability.metricsThreshold}`;
    },
    ruleParamsExpression: React.lazy(() => import('./components/expression')),
    validate: validateMetricThreshold,
    defaultActionMessage: i18n.translate(
      'xpack.infra.metrics.alerting.threshold.defaultActionMessage',
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
