/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertListData } from '../../types';

interface ServerReturnedAlertsData {
  type: 'serverReturnedAlertsData';
  payload: AlertListData;
}

interface UserChangedAlertPageSize {
  type: 'userChangedAlertPageSize';
  payload: number;
}

interface UserChangedAlertPageIndex {
  type: 'userChangedAlertPageIndex';
  payload: number;
}

export type AlertAction =
  | ServerReturnedAlertsData
  | UserChangedAlertPageSize
  | UserChangedAlertPageIndex;
