/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IRuleTypeAlerts, PluginSetupContract } from '@kbn/alerting-plugin/server';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import type { InfraConfig } from '../../types';
import { InfraBackendLibs } from '../infra_types';
import { registerInventoryThresholdRuleType } from './inventory_metric_threshold/register_inventory_metric_threshold_rule_type';
import { LogThresholdAlert } from './log_threshold/log_threshold_executor';
import { registerLogThresholdRuleType } from './log_threshold/register_log_threshold_rule_type';
import { MetricThresholdAlert } from './metric_threshold/metric_threshold_executor';
import { registerMetricThresholdRuleType } from './metric_threshold/register_metric_threshold_rule_type';

export const LOGS_RULES_ALERT_CONTEXT = 'observability.logs';
// Defines which alerts-as-data index logs rules will use
export const LogsRulesTypeAlertDefinition: IRuleTypeAlerts<LogThresholdAlert> = {
  context: LOGS_RULES_ALERT_CONTEXT,
  mappings: { fieldMap: legacyExperimentalFieldMap },
  useEcs: true,
  useLegacyAlerts: true,
  shouldWrite: true,
};

export const METRICS_RULES_ALERT_CONTEXT = 'observability.metrics';
// Defines which alerts-as-data index metrics rules will use
export const MetricsRulesTypeAlertDefinition: IRuleTypeAlerts<MetricThresholdAlert> = {
  context: METRICS_RULES_ALERT_CONTEXT,
  mappings: { fieldMap: legacyExperimentalFieldMap },
  useEcs: true,
  useLegacyAlerts: true,
  shouldWrite: true,
};

const registerRuleTypes = (
  alertingPlugin: PluginSetupContract,
  libs: InfraBackendLibs,
  config: InfraConfig
) => {
  if (alertingPlugin) {
    const registerFns = [
      registerLogThresholdRuleType,
      registerInventoryThresholdRuleType,
      registerMetricThresholdRuleType,
    ];
    registerFns.forEach((fn) => {
      fn(alertingPlugin, libs, config);
    });
  }
};

export { registerRuleTypes };
