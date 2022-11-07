/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import { getRuleType as getGeoContainmentRuleType } from './geo_containment';
import { getRuleType as getThresholdRuleType } from './threshold';
import { getRuleType as getEsQueryRuleType } from './es_query';

export function registerRuleTypes({
  ruleTypeRegistry,
  alerting,
}: {
  ruleTypeRegistry: TriggersAndActionsUIPublicPluginSetup['ruleTypeRegistry'];
  alerting: AlertingSetup;
}) {
  ruleTypeRegistry.register(getGeoContainmentRuleType());
  ruleTypeRegistry.register(getThresholdRuleType());
  ruleTypeRegistry.register(getEsQueryRuleType(alerting));
}
