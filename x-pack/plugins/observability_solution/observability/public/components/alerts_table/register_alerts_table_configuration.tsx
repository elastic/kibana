/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertTableConfigRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/alert_table_config_registry';
import type { ConfigSchema } from '../../plugin';
import { ObservabilityRuleTypeRegistry } from '../..';
import { getAlertsPageTableConfiguration } from './alerts/get_alerts_page_table_configuration';
import { getRuleDetailsTableConfiguration } from './rule_details/get_rule_details_table_configuration';
import { getSloAlertsTableConfiguration } from './slo/get_slo_alerts_table_configuration';

export const registerAlertsTableConfiguration = (
  alertTableConfigRegistry: AlertTableConfigRegistry,
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry,
  config: ConfigSchema
) => {
  // Alert page
  const alertsPageAlertsTableConfig = getAlertsPageTableConfiguration(
    observabilityRuleTypeRegistry,
    config
  );
  alertTableConfigRegistry.register(alertsPageAlertsTableConfig);

  // Rule details page
  const ruleDetailsAlertsTableConfig = getRuleDetailsTableConfiguration(
    observabilityRuleTypeRegistry,
    config
  );
  alertTableConfigRegistry.register(ruleDetailsAlertsTableConfig);

  // SLO
  const sloAlertsTableConfig = getSloAlertsTableConfiguration(observabilityRuleTypeRegistry);
  alertTableConfigRegistry.register(sloAlertsTableConfig);
};
