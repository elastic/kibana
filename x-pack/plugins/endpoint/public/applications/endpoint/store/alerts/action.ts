/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertData } from '../../../../../endpoint_app_types';

interface AppRequestedAlertsData {
  readonly type: 'appRequestedAlertsData';
}

interface ServerReturnedAlertsData {
  readonly type: 'serverReturnedAlertsData';

  readonly payload: AlertData[];
}

export type AlertAction = AppRequestedAlertsData | ServerReturnedAlertsData;
