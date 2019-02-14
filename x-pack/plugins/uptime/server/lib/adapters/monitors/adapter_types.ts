/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorPageTitle } from 'x-pack/plugins/uptime/common/graphql/types';

export interface UMMonitorsAdapter {
  getMonitorChartsData(
    request: any,
    monitorId: string,
    dateRangeStart: string,
    dateRangeEnd: string
  ): Promise<any>;
  getMonitors(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<any>;
  getSnapshotCount(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<any>;
  getFilterBar(request: any, dateRangeStart: string, dateRangeEnd: string): Promise<any>;
  getErrorsList(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<any>;
  getMonitorPageTitle(request: any, monitorId: string): Promise<MonitorPageTitle | null>;
}
