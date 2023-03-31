/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { ALERT_STATUS_ALL, HOST_LIMIT_OPTIONS } from './constants';

export type AlertStatus =
  | typeof ALERT_STATUS_ACTIVE
  | typeof ALERT_STATUS_RECOVERED
  | typeof ALERT_STATUS_ALL;

export interface AlertStatusFilter {
  status: AlertStatus;
  query?: Filter['query'];
  label: string;
}

export type HostLimitOptions = typeof HOST_LIMIT_OPTIONS[number];
