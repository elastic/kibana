/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMGqlRange } from '../../../../common/domain_types';
import { UMMonitorsAdapter } from './adapter_types';

export class MemoryMonitorsAdapter implements UMMonitorsAdapter {
  public async getLatestMonitors(
    request: any,
    dateRangeStart: number,
    dateRangeEnd: number,
    filters: string
  ): Promise<any> {
    throw new Error('Method not implemented.');
  }
  public async getMonitorChartsData(
    req: any,
    monitorId: string,
    dateRangeStart: number,
    dateRangeEnd: number
  ): Promise<any> {
    throw new Error('Method not implemented.');
  }

  public async getSnapshotCount(
    request: any,
    range: UMGqlRange,
    downCount: number,
    windowSize: number
  ): Promise<any> {
    throw new Error('Method not implemented.');
  }
  public async getFilterBar(request: any): Promise<any> {
    throw new Error('Method not implemented.');
  }

  public async getErrorsList(
    request: any,
    dateRangeStart: number,
    dateRangeEnd: number,
    filters?: string | undefined
  ): Promise<any> {
    throw new Error('Method not implemented.');
  }
}
