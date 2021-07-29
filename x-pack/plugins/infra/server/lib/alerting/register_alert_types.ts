/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract } from '../../../../alerting/server';
import { registerMetricThresholdAlertType } from './metric_threshold/register_metric_threshold_alert_type';
import { registerMetricInventoryThresholdAlertType } from './inventory_metric_threshold/register_inventory_metric_threshold_alert_type';
import { registerMetricAnomalyAlertType } from './metric_anomaly/register_metric_anomaly_alert_type';

import { registerLogThresholdAlertType } from './log_threshold/register_log_threshold_alert_type';
import { InfraBackendLibs } from '../infra_types';
import { MlPluginSetup } from '../../../../ml/server';

const registerAlertTypes = (
  alertingPlugin: PluginSetupContract,
  libs: InfraBackendLibs,
  ml?: MlPluginSetup
) => {
  if (alertingPlugin) {
    alertingPlugin.registerType(registerMetricAnomalyAlertType(libs, ml));

    const registerFns = [
      registerLogThresholdAlertType,
      registerMetricInventoryThresholdAlertType,
      registerMetricThresholdAlertType,
    ];
    registerFns.forEach((fn) => {
      fn(alertingPlugin, libs);
    });
  }
};

export { registerAlertTypes };
