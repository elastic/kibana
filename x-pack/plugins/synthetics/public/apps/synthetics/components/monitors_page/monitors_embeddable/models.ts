/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MonitorSelectorState {
  monitorId?: string;
  locationId?: string;
  wMin: number;
  wMax: number;
  height: number;
}

export const initialMonitorSelectorState: MonitorSelectorState = {
  wMin: 769,
  wMax: 1200,
  height: 600,
};
