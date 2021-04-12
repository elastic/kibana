/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lazy } from 'react';
import { AlertType } from '../../../common/alert_types';
import { ApmRuleRegistry } from '../../plugin';

export function registerApmAlerts(apmRuleRegistry: ApmRuleRegistry) {
  apmRuleRegistry.registerType({
    id: AlertType.ErrorCount,
    description: i18n.translate('xpack.apm.alertTypes.errorCount.description', {
      defaultMessage:
        'Alert when the number of errors in a service exceeds a defined threshold.',
    }),
    format: ({ alert }) => {
      return {
        reason: i18n.translate('xpack.apm.alertTypes.errorCount.reason', {
          defaultMessage: `Error count for {serviceName} was above the threshold`,
          values: {
            serviceName: alert['service.name']!,
          },
        }),
        link: `/app/apm/services/${alert['service.name']!}`,
      };
    },
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/apm-alerts.html`;
    },
    alertParamsExpression: lazy(() => import('./error_count_alert_trigger')),
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

  apmRuleRegistry.registerType({
    id: AlertType.TransactionDuration,
    description: i18n.translate(
      'xpack.apm.alertTypes.transactionDuration.description',
      {
        defaultMessage:
          'Alert when the latency of a specific transaction type in a service exceeds a defined threshold.',
      }
    ),
    format: ({ alert }) => ({
      reason: i18n.translate(
        'xpack.apm.alertTypes.transactionDuration.reason',
        {
          defaultMessage: `Latency for {serviceName} was above the threshold`,
          values: {
            serviceName: alert['service.name']!,
          },
        }
      ),
      link: `/app/apm/services/${alert['service.name']!}`,
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/apm-alerts.html`;
    },
    alertParamsExpression: lazy(
      () => import('./transaction_duration_alert_trigger')
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
- Latency threshold: \\{\\{context.threshold\\}\\}ms
- Latency observed: \\{\\{context.triggerValue\\}\\} over the last \\{\\{context.interval\\}\\}`,
      }
    ),
  });

  apmRuleRegistry.registerType({
    id: AlertType.TransactionErrorRate,
    description: i18n.translate(
      'xpack.apm.alertTypes.transactionErrorRate.description',
      {
        defaultMessage:
          'Alert when the rate of transaction errors in a service exceeds a defined threshold.',
      }
    ),
    format: ({ alert }) => ({
      reason: i18n.translate(
        'xpack.apm.alertTypes.transactionErrorRate.reason',
        {
          defaultMessage: `Transaction error rate for {serviceName} was above the threshold`,
          values: {
            serviceName: alert['service.name']!,
          },
        }
      ),
      link: `/app/apm/services/${alert['service.name']!}`,
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/apm-alerts.html`;
    },
    alertParamsExpression: lazy(
      () => import('./transaction_error_rate_alert_trigger')
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

  apmRuleRegistry.registerType({
    id: AlertType.TransactionDurationAnomaly,
    description: i18n.translate(
      'xpack.apm.alertTypes.transactionDurationAnomaly.description',
      {
        defaultMessage: 'Alert when the latency of a service is abnormal.',
      }
    ),
    format: ({ alert }) => ({
      reason: i18n.translate(
        'xpack.apm.alertTypes.transactionDurationAnomaly.reason',
        {
          defaultMessage: `{severityLevel} anomaly detected for {serviceName}`,
          values: {
            serviceName: alert['service.name']!,
            severityLevel: alert['kibana.rac.alert.severity.level']!,
          },
        }
      ),
      link: `/app/apm/services/${alert['service.name']!}`,
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/apm-alerts.html`;
    },
    alertParamsExpression: lazy(
      () => import('./transaction_duration_anomaly_alert_trigger')
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
- Severity value: \\{\\{context.triggerValue\\}\\}
`,
      }
    ),
  });
}
