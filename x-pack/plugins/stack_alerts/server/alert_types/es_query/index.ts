/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import { AlertingSetup } from '../../types';
import { getAlertType } from './alert_type';

interface RegisterParams {
  logger: Logger;
  alerts: AlertingSetup;
}

export function register(params: RegisterParams) {
  const { logger, alerts } = params;
  alerts.registerType(getAlertType(logger));
}
