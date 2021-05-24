/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AveragedStat } from './task_run_calcultors';

// This needs to match the mappings defined in elasticsearch monitoring-kibana.json file
export interface MonitoringMetrics {
  task_manager: {
    drift: {
      by_type: Array<{
        alert_type: string;
        stat: AveragedStat | undefined;
      }>;
    };
  };
}
