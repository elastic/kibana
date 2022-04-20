/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { AlertingPlugin } from '@kbn/alerting-plugin/server';
import { registerAnomalyDetectionAlertType } from './register_anomaly_detection_alert_type';
import { SharedServices } from '../../shared_services';
import { registerJobsMonitoringRuleType } from './register_jobs_monitoring_rule_type';
import { MlServicesProviders } from '../../shared_services/shared_services';

export interface RegisterAlertParams {
  alerting: AlertingPlugin['setup'];
  logger: Logger;
  mlSharedServices: SharedServices;
  mlServicesProviders: MlServicesProviders;
}

export function registerMlAlerts(params: RegisterAlertParams) {
  registerAnomalyDetectionAlertType(params);
  registerJobsMonitoringRuleType(params);
}
