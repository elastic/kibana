/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import { ALERT_REASON, ApmRuleType } from '@kbn/rule-data-utils';
import React, { lazy } from 'react';
import {
  anomalyMessage,
  errorCountMessage,
  transactionDurationMessage,
  transactionErrorRateMessage,
} from '../../../../common/rules/default_action_message';
import { getAlertUrlErrorCount, getAlertUrlTransaction } from '../../../../common/utils/formatters';
import { ApmPluginStartDeps } from '../../../plugin';
import { InvestigateContextProvider } from '../../../investigate/investigate_context_provider';
import type { AlertParams } from './anomaly_rule_type';

// copied from elasticsearch_fieldnames.ts to limit page load bundle size
const SERVICE_ENVIRONMENT = 'service.environment';
const SERVICE_NAME = 'service.name';
const TRANSACTION_TYPE = 'transaction.type';

const LazyErrorRateInvestigateDetailsAppSection = lazy(() =>
  import('./error_count_rule_type/investigate_details_app_section').then((m) => ({
    default: m.ErrorRateInvestigateDetailsAppSection,
  }))
);

const TransactionDurationInvestigateDetailsAppSection = lazy(() =>
  import('./transaction_duration_rule_type/investigate_details_app_section').then((m) => ({
    default: m.TransactionDurationInvestigateDetailsAppSection,
  }))
);

export function registerApmRuleTypes({
  observabilityRuleTypeRegistry,
  coreSetup,
}: {
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  coreSetup: CoreSetup<ApmPluginStartDeps>;
}) {
  observabilityRuleTypeRegistry.register({
    id: ApmRuleType.ErrorCount,
    description: i18n.translate('xpack.apm.alertTypes.errorCount.description', {
      defaultMessage: 'Alert when the number of errors in a service exceeds a defined threshold.',
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
    investigateDetailsAppSection: (props) => (
      <InvestigateContextProvider
        filters={props.filters}
        timeRange={props.timeRange}
        query={props.query}
        coreSetup={coreSetup}
      >
        <LazyErrorRateInvestigateDetailsAppSection {...props} />
      </InvestigateContextProvider>
    ),
  });

  observabilityRuleTypeRegistry.register({
    id: ApmRuleType.TransactionDuration,
    description: i18n.translate('xpack.apm.alertTypes.transactionDuration.description', {
      defaultMessage:
        'Alert when the latency of a specific transaction type in a service exceeds a defined threshold.',
    }),
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
    ruleParamsExpression: lazy(() => import('./transaction_duration_rule_type')),
    validate: () => ({
      errors: [],
    }),
    alertDetailsAppSection: lazy(() => import('../ui_components/alert_details_app_section')),
    requiresAppContext: false,
    defaultActionMessage: transactionDurationMessage,
    priority: 60,
    investigateDetailsAppSection: (props) => (
      <InvestigateContextProvider
        filters={props.filters}
        timeRange={props.timeRange}
        query={props.query}
        coreSetup={coreSetup}
      >
        <TransactionDurationInvestigateDetailsAppSection {...props} />
      </InvestigateContextProvider>
    ),
  });

  observabilityRuleTypeRegistry.register({
    id: ApmRuleType.TransactionErrorRate,
    description: i18n.translate('xpack.apm.alertTypes.transactionErrorRate.description', {
      defaultMessage:
        'Alert when the rate of transaction errors in a service exceeds a defined threshold.',
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
      return `${docLinks.links.alerting.apmRulesTransactionError}`;
    },
    ruleParamsExpression: lazy(() => import('./transaction_error_rate_rule_type')),
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
  if (ruleParams.anomalyDetectorTypes && ruleParams.anomalyDetectorTypes.length < 1) {
    errors.anomalyDetectorTypes = i18n.translate('xpack.apm.validateAnomalyRule.', {
      defaultMessage: 'At least one detector type is required',
    });
  }
  return validationResult;
}
