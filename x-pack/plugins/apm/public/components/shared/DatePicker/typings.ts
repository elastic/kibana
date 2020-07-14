/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface TimePickerQuickRange {
  from: string;
  to: string;
  display: string;
}

export interface TimePickerRefreshInterval {
  pause: boolean;
  value: number;
}

export interface TimePickerTimeDefaults {
  from: string;
  to: string;
}
