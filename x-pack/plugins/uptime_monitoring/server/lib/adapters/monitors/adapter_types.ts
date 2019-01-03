/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMGqlRange } from '../../../../common/domain_types';

export interface UMMonitorsAdapter {
  getMonitorChartsData(
    request: any,
    monitorId: string,
    dateRangeStart: number,
    dateRangeEnd: number
  ): Promise<any>;
  getLatestMonitors(
    request: any,
    dateRangeStart: number,
    dateRangeEnd: number,
    filters: string
  ): Promise<any>;
  getSnapshotCount(
    request: any,
    range: UMGqlRange,
    downCount: number,
    windowSize: number,
    filters?: string
  ): Promise<any>;
  getFilterBar(request: any, dateRangeStart: number, dateRangeEnd: number): Promise<any>;
  getErrorsList(
    request: any,
    dateRangeStart: number,
    dateRangeEnd: number,
    filters?: string
  ): Promise<any>;
}
