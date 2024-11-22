/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lazy } from 'react';
import { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { ObservabilityRuleTypeModel } from '@kbn/observability-plugin/public';
import { LocatorPublic } from '@kbn/share-plugin/common';
import {
  AssetDetailsLocatorParams,
  MetricsExplorerLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import {
  MetricExpressionParams,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
} from '../../../common/alerting/metrics';
import { validateMetricThreshold } from './components/validation';
import { getRuleFormat } from './rule_data_formatters';

export interface MetricThresholdRuleTypeParams extends RuleTypeParams {
  criteria: MetricExpressionParams[];
}

const metricThresholdDefaultActionMessage = i18n.translate(
  'xpack.infra.metrics.alerting.metric.threshold.defaultActionMessage',
  {
    defaultMessage: `'{{context.reason}}'

'{{rule.name}}' is active with the following conditions:

- Affected: '{{context.group}}'
- Metric: '{{context.metric}}'
- Observed value: '{{context.value}}'
- Threshold: '{{context.threshold}}'

[View alert details]('{{context.alertDetailsUrl}}')
`,
  }
);
const metricThresholdDefaultRecoveryMessage = i18n.translate(
  'xpack.infra.metrics.alerting.metric.threshold.defaultRecoveryMessage',
  {
    defaultMessage: `'{{rule.name}}' has recovered.

- Affected: '{{context.group}}'
- Metric: '{{context.metric}}'
- Threshold: '{{context.threshold}}'

[View alert details]('{{context.alertDetailsUrl}}')
`,
  }
);

export function createMetricThresholdRuleType({
  assetDetailsLocator,
  metricsExplorerLocator,
}: {
  assetDetailsLocator?: LocatorPublic<AssetDetailsLocatorParams>;
  metricsExplorerLocator?: LocatorPublic<MetricsExplorerLocatorParams>;
}): ObservabilityRuleTypeModel<MetricThresholdRuleTypeParams> {
  return {
    id: METRIC_THRESHOLD_ALERT_TYPE_ID,
    description: i18n.translate('xpack.infra.metrics.alertFlyout.alertDescription', {
      defaultMessage: 'Alert when the metrics aggregation exceeds the threshold.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.observability.metricsThreshold}`;
    },
    ruleParamsExpression: lazy(() => import('./components/expression')),
    validate: validateMetricThreshold,
    defaultActionMessage: metricThresholdDefaultActionMessage,
    defaultRecoveryMessage: metricThresholdDefaultRecoveryMessage,
    requiresAppContext: false,
    format: getRuleFormat({ assetDetailsLocator, metricsExplorerLocator }),
    alertDetailsAppSection: lazy(() => import('./components/alert_details_app_section')),
    priority: 10,
  };
}
