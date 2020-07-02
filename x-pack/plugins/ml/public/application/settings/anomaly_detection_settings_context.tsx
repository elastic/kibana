/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext } from 'react';

export interface AnomalyDetectionSettingsContextValue {
  canGetFilters: boolean;
  canCreateFilter: boolean;
  canGetCalendars: boolean;
  canCreateCalendar: boolean;
}

export const AnomalyDetectionSettingsContext = createContext<AnomalyDetectionSettingsContextValue>({
  canGetFilters: false,
  canCreateFilter: false,
  canGetCalendars: false,
  canCreateCalendar: false,
});
