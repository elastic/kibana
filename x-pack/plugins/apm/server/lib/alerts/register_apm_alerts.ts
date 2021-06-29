/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { Logger } from 'kibana/server';
import { PluginSetupContract as AlertingPluginSetupContract } from '../../../../alerting/server';
import { RuleDataClient } from '../../../../rule_registry/server';
import { registerTransactionDurationAlertType } from './register_transaction_duration_alert_type';
import { registerTransactionDurationAnomalyAlertType } from './register_transaction_duration_anomaly_alert_type';
import { registerErrorCountAlertType } from './register_error_count_alert_type';
import { APMConfig } from '../..';
import { MlPluginSetup } from '../../../../ml/server';
import { registerTransactionErrorRateAlertType } from './register_transaction_error_rate_alert_type';

export interface RegisterRuleDependencies {
  ruleDataClient: RuleDataClient;
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
