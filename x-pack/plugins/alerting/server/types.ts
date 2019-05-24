/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertInstance } from './alert_instance';
import { AlertService } from './alert_service';

export interface AlertServices {
  alertInstanceFactory: (id: string) => AlertInstance;
}

export interface AlertType {
  id: string;
  description: string;
  execute: (services: AlertServices, params: any) => Promise<Record<string, any> | void>;
}

export interface Alert {
  alertTypeId: string;
  interval: number;
  actionGroups: Record<
    string,
    Array<{
      id: string;
      params: Record<string, any>;
    }>
  >;
  checkParams: Record<string, any>;
}

export interface AlertingPlugin {
  registerType: AlertService['registerType'];
  create: AlertService['create'];
}
