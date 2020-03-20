/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginSetupContract } from '../../../../alerting/server';
import { registerMetricThresholdAlertType } from './metric_threshold/register_metric_threshold_alert_type';

const registerAlertTypes = (alertingPlugin: PluginSetupContract) => {
  if (alertingPlugin) {
    const registerFns = [registerMetricThresholdAlertType];

    registerFns.forEach(fn => {
      fn(alertingPlugin);
    });
  }
};

export { registerAlertTypes };
