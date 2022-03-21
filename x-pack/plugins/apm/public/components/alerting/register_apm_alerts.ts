/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lazy } from 'react';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import type { ObservabilityRuleTypeRegistry } from '../../../../observability/public';
import {
  getAlertUrlErrorCount,
  getAlertUrlTransaction,
} from '../../../common/utils/formatters';
import { AlertType } from '../../../common/alert_types';

// copied from elasticsearch_fieldnames.ts to limit page load bundle size
const SERVICE_ENVIRONMENT = 'service.environment';
const SERVICE_NAME = 'service.name';
const TRANSACTION_TYPE = 'transaction.type';

export function registerApmAlerts(
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
) {
  observabilityRuleTypeRegistry.register({
    id: AlertType.ErrorCount,
    description: i18n.translate('xpack.apm.alertTypes.errorCount.description', {
      defaultMessage:
        'Alert when the number of errors in a service exceeds a defined threshold.',
    }),
    format: ({ fields }) => {
      return {
        reason: fields[ALERT_REASON]!,
        link: getAlertUrlErrorCount(
          String(fields[SERVICE_NAME][0]!),
          fields[SERVICE_ENVIRONMENT] && String(fields[SERVICE_ENVIRONMENT][0])
        ),
      };
    },
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.alerting.apmRules}`;
    },
    ruleParamsExpression: lazy(() => import('./error_count_alert_trigger')),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: false,
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

  observabilityRuleTypeRegistry.register({
    id: AlertType.TransactionDuration,
    description: i18n.translate(
      'xpack.apm.alertTypes.transactionDuration.description',
      {
        defaultMessage:
          'Alert when the latency of a specific transaction type in a service exceeds a defined threshold.',
      }
    ),
    format: ({ fields, formatters: { asDuration } }) => {
      return {
        reason: fields[ALERT_REASON]!,
        link: getAlertUrlTransaction(
          String(fields[SERVICE_NAME][0]!),
          fields[SERVICE_ENVIRONMENT] && String(fields[SERVICE_ENVIRONMENT][0]),
          String(fields[TRANSACTION_TYPE][0]!)
        ),
      };
    },
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.alerting.apmRules}`;
    },
    ruleParamsExpression: lazy(
      () => import('./transaction_duration_alert_trigger')
    ),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: false,
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

  observabilityRuleTypeRegistry.register({
    id: AlertType.TransactionErrorRate,
    description: i18n.translate(
      'xpack.apm.alertTypes.transactionErrorRate.description',
      {
        defaultMessage:
          'Alert when the rate of transaction errors in a service exceeds a defined threshold.',
      }
    ),
    format: ({ fields, formatters: { asPercent } }) => ({
      reason: fields[ALERT_REASON]!,
      link: getAlertUrlTransaction(
        String(fields[SERVICE_NAME][0]!),
        fields[SERVICE_ENVIRONMENT] && String(fields[SERVICE_ENVIRONMENT][0]),
        String(fields[TRANSACTION_TYPE][0]!)
      ),
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.alerting.apmRules}`;
    },
    ruleParamsExpression: lazy(
      () => import('./transaction_error_rate_alert_trigger')
    ),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: false,
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

  observabilityRuleTypeRegistry.register({
    id: AlertType.TransactionDurationAnomaly,
    description: i18n.translate(
      'xpack.apm.alertTypes.transactionDurationAnomaly.description',
      {
        defaultMessage:
          'Alert when either the latency, throughput, or failed transaction rate of a service is anomalous.',
      }
    ),
    format: ({ fields }) => ({
      reason: fields[ALERT_REASON]!,
      link: getAlertUrlTransaction(
        String(fields[SERVICE_NAME][0]!),
        fields[SERVICE_ENVIRONMENT] && String(fields[SERVICE_ENVIRONMENT][0]),
        String(fields[TRANSACTION_TYPE][0]!)
      ),
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.alerting.apmRules}`;
    },
    ruleParamsExpression: lazy(
      () => import('./transaction_duration_anomaly_alert_trigger')
    ),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: false,
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
