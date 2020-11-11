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
    const { system } = (mostRecentPoint.meta as any[])[0];
    const startTime = system.process.cpu.start_time;
    const state = system.process.state;
    return { command, cpu, memory, startTime, state };
  });
