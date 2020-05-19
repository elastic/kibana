/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { ObservabilityPluginSetup } from '../../../../observability/server';
import { AlertingPlugin } from '../../../../alerting/server';
import { registerTransactionDurationAlertType } from './register_transaction_duration_alert_type';
import { registerErrorRateAlertType } from './register_error_rate_alert_type';
import { APMConfig } from '../..';

interface Params {
  alerting: AlertingPlugin['setup'];
  observability?: ObservabilityPluginSetup;
  config$: Observable<APMConfig>;
}

export function registerApmAlerts(params: Params) {
  registerTransactionDurationAlertType({
    alerting: params.alerting,
    observability: params.observability,
    config$: params.config$
  });
  registerErrorRateAlertType({
    alerting: params.alerting,
    observability: params.observability,
    config$: params.config$
  });
}
