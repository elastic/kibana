/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import { AlertingSetup, StackAlertsStartDeps } from '../../types';
import { getAlertType } from './alert_type';

interface RegisterParams {
  logger: Logger;
  data: Promise<StackAlertsStartDeps['triggersActionsUi']['data']>;
  alerts: AlertingSetup;
}

export function register(params: RegisterParams) {
  const { logger, data, alerts } = params;
  alerts.registerType(getAlertType(logger, data));
}
