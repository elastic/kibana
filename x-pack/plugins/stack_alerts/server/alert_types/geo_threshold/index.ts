/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Service, AlertingSetup } from '../../types';
import { getAlertType } from './alert_type';

interface RegisterParams {
  service: Omit<Service, 'indexThreshold'>;
  alerts: AlertingSetup;
}

export function register(params: RegisterParams) {
  const { service, alerts } = params;
  alerts.registerType(getAlertType(service));
}
