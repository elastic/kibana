/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RegisterLegacyAlertTypesParams } from '..';
import {
  GeoContainmentParams,
  GeoContainmentState,
  GeoContainmentInstanceState,
  GeoContainmentInstanceContext,
  getAlertType,
  ActionGroupId,
  RecoveryActionGroupId,
} from './alert_type';

export function register(params: RegisterLegacyAlertTypesParams) {
  const { logger, alerting } = params;
  alerting.registerType<
    GeoContainmentParams,
    GeoContainmentState,
    GeoContainmentInstanceState,
    GeoContainmentInstanceContext,
    typeof ActionGroupId,
    typeof RecoveryActionGroupId
  >(getAlertType(logger));
}
