/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { METRIC_ANOMALY_ALERT_TYPE_ID } from '../../../common/alerting/metrics';
import { RuleTypeModel } from '../../../../triggers_actions_ui/public';
import { RuleTypeParams } from '../../../../alerting/common';
import { validateMetricAnomaly } from './components/validation';

interface MetricAnomalyRuleTypeParams extends RuleTypeParams {
  hasInfraMLCapabilities: boolean;
}

export function createMetricAnomalyRuleType(): RuleTypeModel<MetricAnomalyRuleTypeParams> {
  return {
    id: METRIC_ANOMALY_ALERT_TYPE_ID,
    description: i18n.translate('xpack.infra.metrics.anomaly.alertFlyout.alertDescription', {
      defaultMessage: 'Alert when the anomaly score exceeds a defined threshold.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/observability/${docLinks.DOC_LINK_VERSION}/infrastructure-anomaly-alert.html`;
    },
    ruleParamsExpression: React.lazy(() => import('./components/expression')),
    validate: validateMetricAnomaly,
    defaultActionMessage: i18n.translate(
      'xpack.infra.metrics.alerting.anomaly.defaultActionMessage',
      {
        defaultMessage: `\\{\\{alertName\\}\\} is in a state of \\{\\{context.alertState\\}\\}

\\{\\{context.metric\\}\\} was \\{\\{context.summary\\}\\} than normal at \\{\\{context.timestamp\\}\\}

Typical value: \\{\\{context.typical\\}\\}
Actual value: \\{\\{context.actual\\}\\}
`,
      }
    ),
    requiresAppContext: false,
  };
}
