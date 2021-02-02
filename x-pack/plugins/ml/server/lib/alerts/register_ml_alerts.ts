/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertingPlugin } from '../../../../alerts/server';
import { registerAnomalyThresholdAlertType } from './register_anomaly_threshold_alert_type';
import { SharedServices } from '../../shared_services';

export interface RegisterAlertParams {
  alerts: AlertingPlugin['setup'];
  mlSharedServices: SharedServices;
}

export function registerMlAlerts(params: RegisterAlertParams) {
  registerAnomalyThresholdAlertType(params);
}
