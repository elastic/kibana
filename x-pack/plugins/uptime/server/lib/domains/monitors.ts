/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMMonitorsAdapter } from '../adapters/monitors';

export class UMMonitorsDomain {
  constructor(private readonly adapter: UMMonitorsAdapter, libs: {}) {
    this.adapter = adapter;
  }

  public async getMonitorChartsData(
    request: any,
    monitorId: string,
    dateRangeStart: string,
    dateRangeEnd: string
  ): Promise<any> {
    return this.adapter.getMonitorChartsData(request, monitorId, dateRangeStart, dateRangeEnd);
  }

  public async getMonitors(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<any> {
    return this.adapter.getLatestMonitors(request, dateRangeStart, dateRangeEnd, filters);
  }

  public async getSnapshotCount(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    downCount: number,
    windowSize: number,
    filters?: string | null
  ): Promise<any> {
    return this.adapter.getSnapshotCount(
      request,
      dateRangeStart,
      dateRangeEnd,
      downCount,
      windowSize,
      filters
    );
  }

  public async getFilterBar(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string
  ): Promise<any> {
    return this.adapter.getFilterBar(request, dateRangeStart, dateRangeEnd);
  }

  public async getErrorsList(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<any> {
    return this.adapter.getErrorsList(request, dateRangeStart, dateRangeEnd, filters);
  }
}
