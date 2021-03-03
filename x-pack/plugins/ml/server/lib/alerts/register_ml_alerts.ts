/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { AlertingPlugin } from '../../../../alerts/server';
import { registerAnomalyDetectionAlertType } from './register_anomaly_detection_alert_type';
import { SharedServices } from '../../shared_services';

export interface RegisterAlertParams {
  alerts: AlertingPlugin['setup'];
  logger: Logger;
  mlSharedServices: SharedServices;
  publicBaseUrl: string | undefined;
}

export function registerMlAlerts(params: RegisterAlertParams) {
  registerAnomalyDetectionAlertType(params);
}
