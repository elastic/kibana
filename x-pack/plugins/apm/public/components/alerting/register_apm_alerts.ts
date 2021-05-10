/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lazy } from 'react';
import { stringify } from 'querystring';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { AlertType } from '../../../common/alert_types';
import type { ApmRuleRegistry } from '../../plugin';

const format = ({
  pathname,
  query,
}: {
  pathname: string;
  query: Record<string, any>;
}): string => {
  return `${pathname}?${stringify(query)}`;
};

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
          defaultMessage: `Error count is greater than {threshold} (current value is {measured}) for {serviceName}`,
          values: {
            threshold: alert['kibana.observability.evaluation.threshold'],
            measured: alert['kibana.observability.evaluation.value'],
            serviceName: alert['service.name']!,
          },
        }),
        link: format({
          pathname: `/app/apm/services/${alert['service.name']!}/errors`,
          query: {
            ...(alert['service.environment']
              ? { environment: alert['service.environment'] }
              : { environment: ENVIRONMENT_ALL.value }),
          },
        }),
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
    format: ({ alert, formatters: { asDuration } }) => ({
      reason: i18n.translate(
        'xpack.apm.alertTypes.transactionDuration.reason',
        {
          defaultMessage: `Latency is above {threshold} (current value is {measured}) for {serviceName}`,
          values: {
            threshold: asDuration(
              alert['kibana.observability.evaluation.threshold']
            ),
            measured: asDuration(
              alert['kibana.observability.evaluation.value']
            ),
            serviceName: alert['service.name']!,
          },
        }
      ),
      link: format({
        pathname: `/app/apm/services/${alert['service.name']!}`,
        query: {
          transactionType: alert['transaction.type']!,
          ...(alert['service.environment']
            ? { environment: alert['service.environment'] }
            : { environment: ENVIRONMENT_ALL.value }),
        },
      }),
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
    format: ({ alert, formatters: { asPercent } }) => ({
      reason: i18n.translate(
        'xpack.apm.alertTypes.transactionErrorRate.reason',
        {
          defaultMessage: `Transaction error rate is greater than {threshold} (current value is {measured}) for {serviceName}`,
          values: {
            threshold: asPercent(
              alert['kibana.observability.evaluation.threshold'],
              100
            ),
            measured: asPercent(
              alert['kibana.observability.evaluation.value'],
              100
            ),
            serviceName: alert['service.name']!,
          },
        }
      ),
      link: format({
        pathname: `/app/apm/services/${alert['service.name']!}`,
        query: {
          transactionType: alert['transaction.type']!,
          ...(alert['service.environment']
            ? { environment: alert['service.environment'] }
            : { environment: ENVIRONMENT_ALL.value }),
        },
      }),
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
          defaultMessage: `{severityLevel} anomaly detected for {serviceName} (score was {measured})`,
          values: {
            serviceName: alert['service.name'],
            severityLevel: alert['kibana.rac.alert.severity.level'],
            measured: alert['kibana.observability.evaluation.value'],
          },
        }
      ),
      link: format({
        pathname: `/app/apm/services/${alert['service.name']!}`,
        query: {
          transactionType: alert['transaction.type']!,
          ...(alert['service.environment']
            ? { environment: alert['service.environment'] }
            : { environment: ENVIRONMENT_ALL.value }),
        },
      }),
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
