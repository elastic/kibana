/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AlertingPlugin } from '@kbn/alerting-plugin/server';
import type { MlFeatures } from '../../../common/constants/app';
import { registerAnomalyDetectionAlertType } from './register_anomaly_detection_alert_type';
import type { SharedServices } from '../../shared_services';
import { registerJobsMonitoringRuleType } from './register_jobs_monitoring_rule_type';
import type { MlServicesProviders } from '../../shared_services/shared_services';

export interface RegisterAlertParams {
  alerting: AlertingPlugin['setup'];
  logger: Logger;
  mlSharedServices: SharedServices;
  mlServicesProviders: MlServicesProviders;
}

export function registerMlAlerts(alertParams: RegisterAlertParams, enabledFeatures: MlFeatures) {
  if (enabledFeatures.ad === true) {
    registerAnomalyDetectionAlertType(alertParams);
    registerJobsMonitoringRuleType(alertParams);
  }
}
