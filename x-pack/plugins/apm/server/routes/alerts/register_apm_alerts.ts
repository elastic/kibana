/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { IBasePath, Logger } from 'kibana/server';
import { PluginSetupContract as AlertingPluginSetupContract } from '../../../../alerting/server';
import { IRuleDataClient } from '../../../../rule_registry/server';
import { registerTransactionDurationAlertType } from './register_transaction_duration_alert_type';
import { registerAnomalyAlertType } from './register_anomaly_alert_type';
import { registerErrorCountAlertType } from './register_error_count_alert_type';
import { APMConfig } from '../..';
import { MlPluginSetup } from '../../../../ml/server';
import { registerTransactionErrorRateAlertType } from './register_transaction_error_rate_alert_type';

export interface RegisterRuleDependencies {
  ruleDataClient: IRuleDataClient;
  ml?: MlPluginSetup;
  alerting: AlertingPluginSetupContract;
  config$: Observable<APMConfig>;
  logger: Logger;
  basePath: IBasePath;
}

export function registerApmAlerts(dependencies: RegisterRuleDependencies) {
  registerTransactionDurationAlertType(dependencies);
  registerAnomalyAlertType(dependencies);
  registerErrorCountAlertType(dependencies);
  registerTransactionErrorRateAlertType(dependencies);
}
