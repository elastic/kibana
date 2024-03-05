/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertTableConfigRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/alert_table_config_registry';
import type { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import { getSloAlertsTableConfiguration } from './slo/get_slo_alerts_table_configuration';

export const registerAlertsTableConfiguration = (
  alertTableConfigRegistry: AlertTableConfigRegistry,
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry
) => {
  // SLO Alerts embeddable
  const sloAlertsTableConfig = getSloAlertsTableConfiguration(observabilityRuleTypeRegistry);
  alertTableConfigRegistry.register(sloAlertsTableConfig);
};
