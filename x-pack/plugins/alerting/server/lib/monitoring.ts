/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleMonitoring } from '../types';

export const INITIAL_METRICS = {
  duration: 0,
  total_search_duration_ms: null,
  total_indexing_duration_ms: null,
  total_alerts_detected: null,
  total_alerts_created: null,
  gap_duration_s: null,
};

// Immutably updates the monitoring object with timestamp and duration.
// Used when converting from and between raw monitoring object
export const updateMonitoring = ({
  monitoring,
  timestamp,
  duration,
}: {
  monitoring: RuleMonitoring;
  timestamp: string;
  duration: number;
}) => {
  const { run } = monitoring;
  const { last_run: lastRun, ...rest } = run;
  const { metrics = INITIAL_METRICS } = lastRun;

  return {
    run: {
      last_run: {
        timestamp,
        metrics: {
          ...metrics,
          duration,
        },
      },
      ...rest,
    },
  };
};
