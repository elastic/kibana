/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAlertType as getGeoThresholdAlertType } from './geo_threshold';
import { getAlertType as getGeoContainmentAlertType } from './geo_containment';
import { getAlertType as getThresholdAlertType } from './threshold';
import { Config, STACK_ALERTS_FEATURE_ID } from '../../common';
import { TriggersAndActionsUIPublicPluginSetup } from '../../../triggers_actions_ui/public';
import { LicensingPluginSetup } from '../../../licensing/public';

export function registerAlertTypes({
  alertTypeRegistry,
  config,
  licensing,
}: {
  alertTypeRegistry: TriggersAndActionsUIPublicPluginSetup['alertTypeRegistry'];
  config: Config;
  licensing: LicensingPluginSetup;
}) {
  licensing.license$.subscribe((license) => {
    const { state } = license.check(STACK_ALERTS_FEATURE_ID, 'gold');
    const hasGoldLicense = state === 'valid';
    if (hasGoldLicense && config.enableGeoAlerts) {
      alertTypeRegistry.register(getGeoThresholdAlertType());
      alertTypeRegistry.register(getGeoContainmentAlertType());
    }
    alertTypeRegistry.register(getThresholdAlertType());
  });
}
