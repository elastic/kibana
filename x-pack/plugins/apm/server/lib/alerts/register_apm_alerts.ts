/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { AlertingPlugin } from 'x-pack/plugins/alerting/server';
import { ActionsPlugin } from 'x-pack/plugins/actions/server';
import { MlPluginSetup } from 'x-pack/plugins/ml/server';
import { registerTransactionDurationAlertType } from './register_transaction_duration_alert_type';
import { registerTransactionDurationAnomalyAlertType } from './register_transaction_duration_anomaly_alert_type';
import { registerErrorCountAlertType } from './register_error_count_alert_type';
import { APMConfig } from '../..';
import { registerTransactionErrorRateAlertType } from './register_transaction_error_rate_alert_type';

interface Params {
  alerting: AlertingPlugin['setup'];
  actions: ActionsPlugin['setup'];
  ml?: MlPluginSetup;
  config$: Observable<APMConfig>;
}

export function registerApmAlerts(params: Params) {
  registerTransactionDurationAlertType({
    alerting: params.alerting,
    config$: params.config$,
  });
  registerTransactionDurationAnomalyAlertType({
    alerting: params.alerting,
    ml: params.ml,
    config$: params.config$,
  });
  registerErrorCountAlertType({
    alerting: params.alerting,
    config$: params.config$,
  });
  registerTransactionErrorRateAlertType({
    alerting: params.alerting,
    config$: params.config$,
  });
}
