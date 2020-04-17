/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Service, AlertingSetup } from '../../types';
import { getAlertType } from './alert_type';

export type ESQueryServices = Pick<Service, 'logger'>;

interface RegisterParams {
  alerting: AlertingSetup;
  service: ESQueryServices;
}

export function register(params: RegisterParams) {
  const { service, alerting } = params;

  alerting.registerType(getAlertType(service));
}
