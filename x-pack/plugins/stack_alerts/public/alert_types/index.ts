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
    const geoThresholdAlertType = getGeoThresholdAlertType();
    const geoContainmentAlertType = getGeoContainmentAlertType();
    const thresholdAlertType = getThresholdAlertType();

    if (license.hasAtLeast('gold') && config.enableGeoAlerts) {
      alertTypeRegistry.register(geoThresholdAlertType);
      alertTypeRegistry.register(geoContainmentAlertType);
    } else {
      if (alertTypeRegistry.has(geoThresholdAlertType.id)) {
        alertTypeRegistry.delete(geoThresholdAlertType.id);
      }
      if (alertTypeRegistry.has(geoContainmentAlertType.id)) {
        alertTypeRegistry.delete(geoContainmentAlertType.id);
      }
    }
    if (!alertTypeRegistry.has(thresholdAlertType.id)) {
      alertTypeRegistry.register(thresholdAlertType);
    }
  });
}
