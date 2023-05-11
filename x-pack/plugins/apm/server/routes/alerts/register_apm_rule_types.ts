/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { IBasePath, Logger } from '@kbn/core/server';
import {
  PluginSetupContract as AlertingPluginSetupContract,
  type IRuleTypeAlerts,
} from '@kbn/alerting-plugin/server';
import { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { MlPluginSetup } from '@kbn/ml-plugin/server';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import {
  AGENT_NAME,
  ERROR_GROUP_ID,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_LANGUAGE_NAME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { registerTransactionDurationRuleType } from './rule_types/transaction_duration/register_transaction_duration_rule_type';
import { registerAnomalyRuleType } from './rule_types/anomaly/register_anomaly_rule_type';
import { registerErrorCountRuleType } from './rule_types/error_count/register_error_count_rule_type';
import { APMConfig } from '../..';
import { registerTransactionErrorRateRuleType } from './rule_types/transaction_error_rate/register_transaction_error_rate_rule_type';

export const APM_RULE_TYPE_ALERT_CONTEXT = 'observability.apm';

export const apmRuleTypeAlertFieldMap = {
  ...legacyExperimentalFieldMap,
  [SERVICE_NAME]: {
    type: 'keyword',
    required: false,
  },
  [SERVICE_ENVIRONMENT]: {
    type: 'keyword',
    required: false,
  },
  [TRANSACTION_TYPE]: {
    type: 'keyword',
    required: false,
  },
  [TRANSACTION_NAME]: {
    type: 'keyword',
    required: false,
  },
  [ERROR_GROUP_ID]: {
    type: 'keyword',
    required: false,
  },
  [PROCESSOR_EVENT]: {
    type: 'keyword',
    required: false,
  },
  [AGENT_NAME]: {
    type: 'keyword',
    required: false,
  },
  [SERVICE_LANGUAGE_NAME]: {
    type: 'keyword',
    required: false,
  },
  labels: {
    type: 'object',
    dynamic: true,
    required: false,
  },
};

// Defines which alerts-as-data index alerts will use
export const ApmRuleTypeAlertDefinition: IRuleTypeAlerts = {
  context: APM_RULE_TYPE_ALERT_CONTEXT,
  mappings: { fieldMap: apmRuleTypeAlertFieldMap },
  useLegacyAlerts: true,
};

export interface RegisterRuleDependencies {
  alerting: AlertingPluginSetupContract;
  basePath: IBasePath;
  config$: Observable<APMConfig>;
  logger: Logger;
  ml?: MlPluginSetup;
  observability: ObservabilityPluginSetup;
  ruleDataClient: IRuleDataClient;
}

export function registerApmRuleTypes(dependencies: RegisterRuleDependencies) {
  registerTransactionDurationRuleType(dependencies);
  registerAnomalyRuleType(dependencies);
  registerErrorCountRuleType(dependencies);
  registerTransactionErrorRateRuleType(dependencies);
}
