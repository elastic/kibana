/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Alert } from '../../alerting/common';
import { AlertSeverity, AlertParamType } from './enums';

export interface CommonBaseAlert {
  type: string;
  label: string;
  paramDetails: CommonAlertParamDetails;
  rawAlert: Alert | undefined;
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

export const CommonAlertSeverityColorMap = {
  [AlertSeverity.Danger]: '#BD271E',
  [AlertSeverity.Warning]: '#F5A700',
  [AlertSeverity.Success]: '#017D73',
};

export interface CommonAlertParamDetail {
  rawLabel: string;
  withValueLabel: string;
  type: AlertParamType;
}

export interface CommonAlertParamDetails {
  [name: string]: CommonAlertParamDetail;
}

export interface CommonAlertParams {
  [name: string]: string | number;
}
