/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../../common/api';
import { AlertInfo } from '../../common/types';

interface Alert {
  id: string;
  index: string;
  destination?: {
    ip: string;
  };
  source?: {
    ip: string;
  };
}

export type CasesClientGetAlertsResponse = Alert[];

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
