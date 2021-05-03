/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UptimeAlertTypeFactory } from './types';
import { statusCheckAlertFactory } from './status_check';
import { tlsAlertFactory } from './tls';
import { durationAnomalyAlertFactory } from './duration_anomaly';

export const uptimeAlertTypeFactories: UptimeAlertTypeFactory[] = [
  statusCheckAlertFactory,
  tlsAlertFactory,
  durationAnomalyAlertFactory,
];
