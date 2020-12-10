/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AlertState } from '../../common/types/alerts';
import { AlertsByName } from './types';

export interface IAlertsContext {
  allAlerts: AlertsByName;
  filterOutAlertStates: (alertState: AlertState) => boolean;
}

export const AlertsContext = React.createContext({
  allAlerts: {} as AlertsByName,
  filterOutAlertStates: () => true,
});
