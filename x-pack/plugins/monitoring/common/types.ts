/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Alert } from '../../alerting/common';

export interface CommonBaseAlert {
  type: string;
  label: string;
  defaultThrottle: string;
  rawAlert: Alert;
}

export interface CommonActionDefaultParameters {
  [alertTypeId: string]: {
    [actionTypeId: string]: any;
  };
}

export interface CommonAlertStatus {
  exists: boolean;
  enabled: boolean;
  states: CommonAlertState[];
  alert: CommonBaseAlert;
}

export interface CommonAlertState {
  firing: boolean;
  state: any;
  meta: any;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CommonAlertFilter {}

export interface CommonAlertCpuUsageFilter extends CommonAlertFilter {
  nodeUuid: string;
}
