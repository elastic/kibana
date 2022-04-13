/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import { AlertingSetup } from '../../types';
import {
  GeoContainmentState,
  GeoContainmentInstanceState,
  GeoContainmentInstanceContext,
  getAlertType,
  ActionGroupId,
  RecoveryActionGroupId,
} from './alert_type';

import { GeoContainmentExtractedParams, GeoContainmentParams } from './alert_type';

interface RegisterParams {
  logger: Logger;
  alerting: AlertingSetup;
}

export function register(params: RegisterParams) {
  const { logger, alerting } = params;
  alerting.registerType<
    GeoContainmentParams,
    GeoContainmentExtractedParams,
    GeoContainmentState,
    GeoContainmentInstanceState,
    GeoContainmentInstanceContext,
    typeof ActionGroupId,
    typeof RecoveryActionGroupId
  >(getAlertType(logger));
}
