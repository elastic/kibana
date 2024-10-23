/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertTableConfigRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/alert_table_config_registry';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { HttpSetup } from '@kbn/core-http-browser';
import { NotificationsStart } from '@kbn/core-notifications-browser';
import { RELATED_ALERTS_TABLE_CONFIG_ID } from '../../constants';
import type { ConfigSchema } from '../../plugin';
import { ObservabilityRuleTypeRegistry } from '../..';
import { getAlertsPageTableConfiguration } from './alerts/get_alerts_page_table_configuration';
import { getRuleDetailsTableConfiguration } from './rule_details/get_rule_details_table_configuration';
import { getSloAlertsTableConfiguration } from './slo/get_slo_alerts_table_configuration';
import { getObservabilityTableConfiguration } from './observability/get_alerts_page_table_configuration';

export const registerAlertsTableConfiguration = (
  alertTableConfigRegistry: AlertTableConfigRegistry,
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry,
  config: ConfigSchema,
  dataViews: DataViewsServicePublic,
  http: HttpSetup,
  notifications: NotificationsStart
) => {
  // Observability table
  const observabilityAlertsTableConfig = getObservabilityTableConfiguration(
    observabilityRuleTypeRegistry,
    config
  );
  alertTableConfigRegistry.register(observabilityAlertsTableConfig);

  // Alerts page
  const alertsPageAlertsTableConfig = getAlertsPageTableConfiguration(
    observabilityRuleTypeRegistry,
    config,
    dataViews,
    http,
    notifications
  );
  alertTableConfigRegistry.register(alertsPageAlertsTableConfig);

  // Alert details page
  const alertDetailsPageAlertsTableConfig = getAlertsPageTableConfiguration(
    observabilityRuleTypeRegistry,
    config,
    dataViews,
    http,
    notifications,
    RELATED_ALERTS_TABLE_CONFIG_ID
  );
  alertTableConfigRegistry.register(alertDetailsPageAlertsTableConfig);

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
