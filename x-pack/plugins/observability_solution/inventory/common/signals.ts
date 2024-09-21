/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValuesType } from 'utility-types';

export const SIGNAL_TYPES = {
  ALERT: 'alert',
  SLO: 'slo',
  ANOMALY: 'anomaly',
} as const;

export type SIGNAL_TYPES = ValuesType<typeof SIGNAL_TYPES>;

interface SignalBase {
  type: string;
}

export interface AlertSignal extends SignalBase {
  type: 'alert';
  id: string;
}

export interface SloSignal extends SignalBase {
  type: 'slo';
  id: string;
}

export interface AnomalySignal extends SignalBase {
  type: 'anomaly';
}

export type Signal = AlertSignal | SloSignal | AnomalySignal;
