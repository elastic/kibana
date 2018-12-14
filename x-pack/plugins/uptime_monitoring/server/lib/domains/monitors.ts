/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMGqlRange } from '../../../common/domain_types';
import { UMMonitorsAdapter } from '../adapters/monitors';

export class UMMonitorsDomain {
  constructor(private readonly adapter: UMMonitorsAdapter, libs: {}) {
    this.adapter = adapter;
  }

  public async getMonitorChartsData(
    request: any,
    monitorId: string,
    dateRangeStart: number,
    dateRangeEnd: number
  ): Promise<any> {
    return this.adapter.getMonitorChartsData(request, monitorId, dateRangeStart, dateRangeEnd);
  }

  public async getLatestMonitors(request: any, range: UMGqlRange): Promise<any> {
    return this.adapter.getLatestMonitors(request, range);
  }

  public async getSnapshotCount(
    request: any,
    range: UMGqlRange,
    downCount: number,
    windowSize: number
  ): Promise<any> {
    return this.adapter.getSnapshotCount(request, range, downCount, windowSize);
  }
}
