/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProcessListAPIResponse } from '../../../../../../../../common/http_api';

export const parseProcessList = (processList: ProcessListAPIResponse) =>
  processList.map((process) => {
    const command = process.id;
    let mostRecentPoint;
    for (let i = process.rows.length - 1; i >= 0; i--) {
      const point = process.rows[i];
      if (point && Array.isArray(point.meta) && point.meta?.length) {
        mostRecentPoint = point;
        break;
      }
    }
    if (!mostRecentPoint) return { command, cpu: null, memory: null, startTime: null, state: null };

    const { cpu, memory } = mostRecentPoint;
    const { system, process: processMeta, user } = (mostRecentPoint.meta as any[])[0];
    const startTime = system.process.cpu.start_time;
    const state = system.process.state;

    const timeseries = {
      cpu: pickTimeseries(process.rows, 'cpu'),
      memory: pickTimeseries(process.rows, 'memory'),
    };

    return {
      command,
      cpu,
      memory,
      startTime,
      state,
      pid: processMeta.pid,
      user: user.name,
      timeseries,
    };
  });

const pickTimeseries = (rows: any[], metricID: string) => ({
  rows: rows.map((row) => ({
    timestamp: row.timestamp,
    metric_0: row[metricID],
  })),
  columns: [
    { name: 'timestamp', type: 'date' },
    { name: 'metric_0', type: 'number' },
  ],
  id: metricID,
});
