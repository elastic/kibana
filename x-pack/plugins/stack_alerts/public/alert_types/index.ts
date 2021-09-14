/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertType as getGeoContainmentAlertType } from './geo_containment';
import { getAlertType as getThresholdAlertType } from './threshold';
import { getAlertType as getEsQueryAlertType } from './es_query';
import { Config } from '../../common';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../triggers_actions_ui/public';

export function registerAlertTypes({
  ruleTypeRegistry,
  config,
}: {
  ruleTypeRegistry: TriggersAndActionsUIPublicPluginSetup['ruleTypeRegistry'];
  config: Config;
}) {
  ruleTypeRegistry.register(getGeoContainmentAlertType());
  ruleTypeRegistry.register(getThresholdAlertType());
  ruleTypeRegistry.register(getEsQueryAlertType());
}
