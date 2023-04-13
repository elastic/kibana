/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import { type IRuleTypeAlerts, PluginSetupContract } from '@kbn/alerting-plugin/server';
import { MlPluginSetup } from '@kbn/ml-plugin/server';
import { registerMetricThresholdRuleType } from './metric_threshold/register_metric_threshold_rule_type';
import { registerMetricInventoryThresholdRuleType } from './inventory_metric_threshold/register_inventory_metric_threshold_rule_type';
import { registerMetricAnomalyRuleType } from './metric_anomaly/register_metric_anomaly_rule_type';
import { registerLogThresholdRuleType } from './log_threshold/register_log_threshold_rule_type';
import { InfraBackendLibs } from '../infra_types';

export const LOGS_RULES_ALERT_CONTEXT = 'observability.logs';
// Defines which alerts-as-data index logs rules will use
export const LogsRulesTypeAlertDefinition: IRuleTypeAlerts = {
  context: LOGS_RULES_ALERT_CONTEXT,
  mappings: { fieldMap: legacyExperimentalFieldMap },
  useEcs: true,
  useLegacyAlerts: true,
};

export const METRICS_RULES_ALERT_CONTEXT = 'observability.metrics';
// Defines which alerts-as-data index metrics rules will use
export const MetricsRulesTypeAlertDefinition: IRuleTypeAlerts = {
  context: METRICS_RULES_ALERT_CONTEXT,
  mappings: { fieldMap: legacyExperimentalFieldMap },
  useEcs: true,
  useLegacyAlerts: true,
};

const registerRuleTypes = (
  alertingPlugin: PluginSetupContract,
  libs: InfraBackendLibs,
  ml?: MlPluginSetup
) => {
  if (alertingPlugin) {
    alertingPlugin.registerType(registerMetricAnomalyRuleType(libs, ml));

    const registerFns = [
      registerLogThresholdRuleType,
      registerMetricInventoryThresholdRuleType,
      registerMetricThresholdRuleType,
    ];
    registerFns.forEach((fn) => {
      fn(alertingPlugin, libs);
    });
  }
};

export { registerRuleTypes };
