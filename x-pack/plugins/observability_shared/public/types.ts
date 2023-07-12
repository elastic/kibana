/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import { AppMountParameters } from '@kbn/core-application-browser';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { ALERT_STATUS_ALL } from './constants';
export interface ApmIndicesConfig {
  error: string;
  onboarding: string;
  span: string;
  transaction: string;
  metric: string;
}

export interface UXMetrics {
  cls: number | null;
  fid?: number | null;
  lcp?: number | null;
  tbt: number;
  fcp?: number | null;
  coreVitalPages: number;
  lcpRanks: number[];
  fidRanks: number[];
  clsRanks: number[];
}

export interface HeaderMenuPortalProps {
  children: ReactNode;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
}

export interface TimePickerTimeDefaults {
  from: string;
  to: string;
}

export type AlertStatus =
  | typeof ALERT_STATUS_ACTIVE
  | typeof ALERT_STATUS_RECOVERED
  | typeof ALERT_STATUS_ALL;

export interface AlertStatusFilter {
  status: AlertStatus;
  query: string;
  label: string;
}
