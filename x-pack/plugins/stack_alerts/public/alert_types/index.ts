/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import { getAlertType as getGeoContainmentAlertType } from './geo_containment';
import { getAlertType as getThresholdAlertType } from './threshold';
import { getAlertType as getEsQueryAlertType } from './es_query';
import { Config } from '../../common';

export function registerAlertTypes({
  ruleTypeRegistry,
  config,
  alerting,
}: {
  ruleTypeRegistry: TriggersAndActionsUIPublicPluginSetup['ruleTypeRegistry'];
  config: Config;
  alerting: AlertingSetup;
}) {
  ruleTypeRegistry.register(getGeoContainmentAlertType());
  ruleTypeRegistry.register(getThresholdAlertType());
  ruleTypeRegistry.register(getEsQueryAlertType(alerting));
}
