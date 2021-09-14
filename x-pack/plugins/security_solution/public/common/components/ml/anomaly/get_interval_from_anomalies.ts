/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Anomalies } from '../types';

export const getIntervalFromAnomalies = (anomalies: Anomalies | null) => {
  if (anomalies == null) {
    return 'day';
  } else {
    return anomalies.interval;
  }
};
