/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { IBasePath, Logger } from '@kbn/core/server';
import { PluginSetupContract as AlertingPluginSetupContract } from '@kbn/alerting-plugin/server';
import { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { MlPluginSetup } from '@kbn/ml-plugin/server';
import { registerTransactionDurationRuleType } from './rule_types/transaction_duration/register_transaction_duration_rule_type';
import { registerAnomalyRuleType } from './rule_types/anomaly/register_anomaly_rule_type';
import { registerErrorCountRuleType } from './rule_types/error_count/register_error_count_rule_type';
import { APMConfig } from '../..';
import { registerTransactionErrorRateRuleType } from './rule_types/transaction_error_rate/register_transaction_error_rate_rule_type';

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
