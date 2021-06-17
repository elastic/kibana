/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common';
import { AlertInfo } from '../../common';
import { CasesClientGetAlertsResponse } from './types';
import { get } from './get';
import { updateStatus } from './update_status';
import { CasesClientArgs } from '../types';

/**
 * Defines the fields necessary to update an alert's status.
 */
export interface UpdateAlertRequest {
  id: string;
  index: string;
  status: CaseStatuses;
}

export interface AlertUpdateStatus {
  alerts: UpdateAlertRequest[];
}

export interface AlertGet {
  alertsInfo: AlertInfo[];
}

export interface AlertSubClient {
  get(args: AlertGet): Promise<CasesClientGetAlertsResponse>;
  updateStatus(args: AlertUpdateStatus): Promise<void>;
}

export const createAlertsSubClient = (clientArgs: CasesClientArgs): AlertSubClient => {
  const alertsSubClient: AlertSubClient = {
    get: (params: AlertGet) => get(params, clientArgs),
    updateStatus: (params: AlertUpdateStatus) => updateStatus(params, clientArgs),
  };

  return Object.freeze(alertsSubClient);
};
