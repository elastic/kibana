/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lazy } from 'react';
import { ALERT_REASON, ApmRuleType } from '@kbn/rule-data-utils';
import type { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import {
  getAlertUrlErrorCount,
  getAlertUrlTransaction,
} from '../../../../common/utils/formatters';
import {
  anomalyMessage,
  errorCountMessage,
  transactionDurationMessage,
  transactionErrorRateMessage,
} from '../../../../common/rules/default_action_message';
import { AlertParams } from './anomaly_rule_type';

// copied from elasticsearch_fieldnames.ts to limit page load bundle size
const SERVICE_ENVIRONMENT = 'service.environment';
const SERVICE_NAME = 'service.name';
const TRANSACTION_TYPE = 'transaction.type';

export function registerApmRuleTypes(
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
) {
  observabilityRuleTypeRegistry.register({
    id: ApmRuleType.ErrorCount,
    description: i18n.translate('xpack.apm.alertTypes.errorCount.description', {
      defaultMessage:
        'Alert when the number of errors in a service exceeds a defined threshold.',
    }),
    format: ({ fields }) => {
      return {
        reason: fields[ALERT_REASON]!,
        link: getAlertUrlErrorCount(
          // TODO:fix SERVICE_NAME when we move it to initializeIndex
          String(fields[SERVICE_NAME]![0]),
          fields[SERVICE_ENVIRONMENT] && String(fields[SERVICE_ENVIRONMENT][0])
        ),
      };
    },
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.alerting.apmRulesErrorCount}`;
    },
    ruleParamsExpression: lazy(() => import('./error_count_rule_type')),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: false,
    defaultActionMessage: errorCountMessage,
    priority: 80,
  });

  observabilityRuleTypeRegistry.register({
    id: ApmRuleType.TransactionDuration,
    description: i18n.translate(
      'xpack.apm.alertTypes.transactionDuration.description',
      {
        defaultMessage:
          'Alert when the latency of a specific transaction type in a service exceeds a defined threshold.',
      }
    ),
    format: ({ fields }) => {
      return {
        reason: fields[ALERT_REASON]!,
        link: getAlertUrlTransaction(
          // TODO:fix SERVICE_NAME when we move it to initializeIndex
          String(fields[SERVICE_NAME]![0]),
          fields[SERVICE_ENVIRONMENT] && String(fields[SERVICE_ENVIRONMENT][0]),
          String(fields[TRANSACTION_TYPE]![0])
        ),
      };
    },
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.alerting.apmRulesTransactionDuration}`;
    },
    ruleParamsExpression: lazy(
      () => import('./transaction_duration_rule_type')
    ),
    validate: () => ({
      errors: [],
    }),
    alertDetailsAppSection: lazy(
      () => import('../ui_components/alert_details_app_section')
    ),
    requiresAppContext: false,
    defaultActionMessage: transactionDurationMessage,
    priority: 60,
  });

  observabilityRuleTypeRegistry.register({
    id: ApmRuleType.TransactionErrorRate,
    description: i18n.translate(
      'xpack.apm.alertTypes.transactionErrorRate.description',
      {
        defaultMessage:
          'Alert when the rate of transaction errors in a service exceeds a defined threshold.',
      }
    ),
    format: ({ fields }) => ({
      reason: fields[ALERT_REASON]!,
      link: getAlertUrlTransaction(
        // TODO:fix SERVICE_NAME when we move it to initializeIndex
        String(fields[SERVICE_NAME]![0]),
        fields[SERVICE_ENVIRONMENT] && String(fields[SERVICE_ENVIRONMENT][0]),
        String(fields[TRANSACTION_TYPE]![0])
      ),
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.alerting.apmRulesTransactionError}`;
    },
    ruleParamsExpression: lazy(
      () => import('./transaction_error_rate_rule_type')
    ),
    validate: () => ({
      errors: [],
    }),
    requiresAppContext: false,
    defaultActionMessage: transactionErrorRateMessage,
    priority: 70,
  });

  observabilityRuleTypeRegistry.register({
    id: ApmRuleType.Anomaly,
    description: i18n.translate('xpack.apm.alertTypes.anomaly.description', {
      defaultMessage:
        'Alert when either the latency, throughput, or failed transaction rate of a service is anomalous.',
    }),
    format: ({ fields }) => ({
      reason: fields[ALERT_REASON]!,
      link: getAlertUrlTransaction(
        // TODO:fix SERVICE_NAME when we move it to initializeIndex
        String(fields[SERVICE_NAME]![0]),
        fields[SERVICE_ENVIRONMENT] && String(fields[SERVICE_ENVIRONMENT][0]),
        String(fields[TRANSACTION_TYPE]![0])
      ),
    }),
    iconClass: 'bell',
    documentationUrl(docLinks) {
      return `${docLinks.links.alerting.apmRulesAnomaly}`;
    },
    ruleParamsExpression: lazy(() => import('./anomaly_rule_type')),
    validate: validateAnomalyRule,
    requiresAppContext: false,
    defaultActionMessage: anomalyMessage,
    priority: 90,
  });
}

function validateAnomalyRule(ruleParams: AlertParams) {
  const validationResult = { errors: {} };
  const errors: {
    anomalyDetectorTypes?: string;
  } = {};
  validationResult.errors = errors;
  if (
    ruleParams.anomalyDetectorTypes &&
    ruleParams.anomalyDetectorTypes.length < 1
  ) {
    errors.anomalyDetectorTypes = i18n.translate(
      'xpack.apm.validateAnomalyRule.',
      {
        defaultMessage: 'At least one detector type is required',
      }
    );
  }
  return validationResult;
}
