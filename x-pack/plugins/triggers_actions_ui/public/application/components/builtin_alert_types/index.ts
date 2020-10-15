/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAlertType as getGeoThresholdAlertType } from './geo_threshold';
import { getAlertType as getThresholdAlertType } from './threshold';
import { TypeRegistry } from '../../type_registry';
import { AlertTypeModel } from '../../../types';
import { TriggersActionsUiConfigType } from '../../../plugin';

export function registerBuiltInAlertTypes({
  alertTypeRegistry,
  triggerActionsUiConfig,
}: {
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
  triggerActionsUiConfig: TriggersActionsUiConfigType;
}) {
  if (triggerActionsUiConfig.enableGeoTrackingThresholdAlert) {
    alertTypeRegistry.register(getGeoThresholdAlertType());
  }
  alertTypeRegistry.register(getThresholdAlertType());
}
