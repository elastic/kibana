/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { lazy } from 'react';
import { AlertType } from '../../../common/alert_types';
import { ApmPluginStartDeps } from '../../plugin';

export function registerApmAlerts(
  alertTypeRegistry: ApmPluginStartDeps['triggersActionsUi']['alertTypeRegistry']
) {
  alertTypeRegistry.register({
    id: AlertType.ErrorCount,
    name: i18n.translate('xpack.apm.alertTypes.errorCount', {
      defaultMessage: 'Error count threshold',
    }),
    description: i18n.translate('xpack.apm.alertTypes.errorCount.description', {
      defaultMessage:
        'Alert when the number of errors in a service exceeds a defined threshold.',
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/apm-alerts.html`;
    },
    alertParamsExpression: lazy(() => import('./ErrorCountAlertTrigger')),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: true,
    defaultActionMessage: i18n.translate(
      'xpack.apm.alertTypes.errorCount.defaultActionMessage',
      {
        defaultMessage: `\\{\\{alertName\\}\\} alert is firing because of the following conditions:

- Service name: \\{\\{context.serviceName\\}\\}
- Environment: \\{\\{context.environment\\}\\}
- Threshold: \\{\\{context.threshold\\}\\} errors
- Triggered value: \\{\\{context.triggerValue\\}\\} errors over the last \\{\\{context.interval\\}\\}`,
      }
    ),
  });

  alertTypeRegistry.register({
    id: AlertType.TransactionDuration,
    name: i18n.translate('xpack.apm.alertTypes.transactionDuration', {
      defaultMessage: 'Transaction duration threshold',
    }),
    description: i18n.translate(
      'xpack.apm.alertTypes.transactionDuration.description',
      {
        defaultMessage:
          'Alert when the duration of a specific transaction type in a service exceeds a defined threshold.',
      }
    ),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/apm-alerts.html`;
    },
    alertParamsExpression: lazy(
      () => import('./TransactionDurationAlertTrigger')
    ),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: true,
    defaultActionMessage: i18n.translate(
      'xpack.apm.alertTypes.transactionDuration.defaultActionMessage',
      {
        defaultMessage: `\\{\\{alertName\\}\\} alert is firing because of the following conditions:

- Service name: \\{\\{context.serviceName\\}\\}
- Type: \\{\\{context.transactionType\\}\\}
- Environment: \\{\\{context.environment\\}\\}
- Threshold: \\{\\{context.threshold\\}\\}ms
- Triggered value: \\{\\{context.triggerValue\\}\\} over the last \\{\\{context.interval\\}\\}`,
      }
    ),
  });

  alertTypeRegistry.register({
    id: AlertType.TransactionErrorRate,
    name: i18n.translate('xpack.apm.alertTypes.transactionErrorRate', {
      defaultMessage: 'Transaction error rate threshold',
    }),
    description: i18n.translate(
      'xpack.apm.alertTypes.transactionErrorRate.description',
      {
        defaultMessage:
          'Alert when the rate of transaction errors in a service exceeds a defined threshold.',
      }
    ),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/apm-alerts.html`;
    },
    alertParamsExpression: lazy(
      () => import('./TransactionErrorRateAlertTrigger')
    ),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: true,
    defaultActionMessage: i18n.translate(
      'xpack.apm.alertTypes.transactionErrorRate.defaultActionMessage',
      {
        defaultMessage: `\\{\\{alertName\\}\\} alert is firing because of the following conditions:

- Service name: \\{\\{context.serviceName\\}\\}
- Type: \\{\\{context.transactionType\\}\\}
- Environment: \\{\\{context.environment\\}\\}
- Threshold: \\{\\{context.threshold\\}\\}%
- Triggered value: \\{\\{context.triggerValue\\}\\}% of errors over the last \\{\\{context.interval\\}\\}`,
      }
    ),
  });

  alertTypeRegistry.register({
    id: AlertType.TransactionDurationAnomaly,
    name: i18n.translate('xpack.apm.alertTypes.transactionDurationAnomaly', {
      defaultMessage: 'Transaction duration anomaly',
    }),
    description: i18n.translate(
      'xpack.apm.alertTypes.transactionDurationAnomaly.description',
      {
        defaultMessage:
          'Alert when the overall transaction duration of a service is considered anomalous.',
      }
    ),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/apm-alerts.html`;
    },
    alertParamsExpression: lazy(
      () => import('./TransactionDurationAnomalyAlertTrigger')
    ),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: true,
    defaultActionMessage: i18n.translate(
      'xpack.apm.alertTypes.transactionDurationAnomaly.defaultActionMessage',
      {
        defaultMessage: `\\{\\{alertName\\}\\} alert is firing because of the following conditions:

- Service name: \\{\\{context.serviceName\\}\\}
- Type: \\{\\{context.transactionType\\}\\}
- Environment: \\{\\{context.environment\\}\\}
- Severity threshold: \\{\\{context.threshold\\}\\}
- Severity value: \\{\\{context.thresholdValue\\}\\}
`,
      }
    ),
  });
}
