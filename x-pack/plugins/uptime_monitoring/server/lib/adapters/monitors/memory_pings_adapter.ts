/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMMonitorsAdapter } from './adapter_types';

export class MemoryMonitorsAdapter implements UMMonitorsAdapter {
  public async getMonitorChartsData(
    req: any,
    monitorId: string,
    dateRangeStart: number,
    dateRangeEnd: number
  ): Promise<any> {
    throw new Error('Method not implemented.');
  }
}
