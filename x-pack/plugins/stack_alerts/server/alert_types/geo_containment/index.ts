/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import { AlertingSetup } from '../../types';
import {
  GeoContainmentParams,
  GeoContainmentState,
  GeoContainmentInstanceState,
  GeoContainmentInstanceContext,
  getAlertType,
  ActionGroupId,
  RecoveryActionGroupId,
} from './alert_type';

interface RegisterParams {
  logger: Logger;
  alerts: AlertingSetup;
}

export function register(params: RegisterParams) {
  const { logger, alerts } = params;
  alerts.registerType<
    GeoContainmentParams,
    GeoContainmentState,
    GeoContainmentInstanceState,
    GeoContainmentInstanceContext,
    typeof ActionGroupId,
    typeof RecoveryActionGroupId
  >(getAlertType(logger));
}
