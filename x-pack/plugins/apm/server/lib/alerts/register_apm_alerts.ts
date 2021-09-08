/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from 'kibana/server';
import { Observable } from 'rxjs';
import type { APMConfig } from '../..';
import type { PluginSetupContract as AlertingPluginSetupContract } from '../../../../alerting/server';
import type { MlPluginSetup } from '../../../../ml/server';
import type { IRuleDataClient } from '../../../../rule_registry/server';
import { registerErrorCountAlertType } from './register_error_count_alert_type';
import { registerTransactionDurationAlertType } from './register_transaction_duration_alert_type';
import { registerTransactionDurationAnomalyAlertType } from './register_transaction_duration_anomaly_alert_type';
import { registerTransactionErrorRateAlertType } from './register_transaction_error_rate_alert_type';

export interface RegisterRuleDependencies {
  ruleDataClient: IRuleDataClient;
  ml?: MlPluginSetup;
  alerting: AlertingPluginSetupContract;
  config$: Observable<APMConfig>;
  logger: Logger;
}

export function registerApmAlerts(dependencies: RegisterRuleDependencies) {
  registerTransactionDurationAlertType(dependencies);
  registerTransactionDurationAnomalyAlertType(dependencies);
  registerErrorCountAlertType(dependencies);
  registerTransactionErrorRateAlertType(dependencies);
}
