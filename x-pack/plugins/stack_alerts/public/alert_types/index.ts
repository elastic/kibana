/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAlertType as getGeoThresholdAlertType } from './geo_threshold';
import { getAlertType as getGeoContainmentAlertType } from './geo_containment';
import { getAlertType as getThresholdAlertType } from './threshold';
import { Config } from '../../common';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../triggers_actions_ui/public';

export function registerAlertTypes({
  alertTypeRegistry,
  config,
}: {
  alertTypeRegistry: TriggersAndActionsUIPublicPluginSetup['alertTypeRegistry'];
  config: Config;
}) {
  if (config.enableGeoAlerting) {
    alertTypeRegistry.register(getGeoThresholdAlertType());
    alertTypeRegistry.register(getGeoContainmentAlertType());
  }
  alertTypeRegistry.register(getThresholdAlertType());
}
