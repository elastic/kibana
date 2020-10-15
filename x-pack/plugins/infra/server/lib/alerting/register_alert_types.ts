/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginSetupContract } from '../../../../alerts/server';
import { registerMetricThresholdAlertType } from './metric_threshold/register_metric_threshold_alert_type';
import { registerMetricInventoryThresholdAlertType } from './inventory_metric_threshold/register_inventory_metric_threshold_alert_type';
import { registerLogThresholdAlertType } from './log_threshold/register_log_threshold_alert_type';
import { InfraBackendLibs } from '../infra_types';

const registerAlertTypes = (alertingPlugin: PluginSetupContract, libs: InfraBackendLibs) => {
  if (alertingPlugin) {
    alertingPlugin.registerType(registerMetricThresholdAlertType(libs));
    alertingPlugin.registerType(registerMetricInventoryThresholdAlertType(libs));

    const registerFns = [registerLogThresholdAlertType];
    registerFns.forEach((fn) => {
      fn(alertingPlugin, libs);
    });
  }
};

export { registerAlertTypes };
