/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocCount, HistogramSeries, Ping, PingResults } from '../../../common/graphql/types';
import { UMPingsAdapter } from '../adapters/pings';

export class UMPingsDomain {
  constructor(private readonly adapter: UMPingsAdapter, libs: {}) {
    this.adapter = adapter;
  }

  public async getAll(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    monitorId?: string | null,
    status?: string | null,
    sort?: string | null,
    size?: number | null
  ): Promise<PingResults> {
    return this.adapter.getAll(
      request,
      dateRangeStart,
      dateRangeEnd,
      monitorId,
      status,
      sort,
      size
    );
  }

  public async getLatestMonitorDocs(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    monitorId?: string | null
  ): Promise<Ping[]> {
    return this.adapter.getLatestMonitorDocs(request, dateRangeStart, dateRangeEnd, monitorId);
  }

  public async getPingHistogram(
    request: any,
    dateRangeStart: string,
    dateRangeEnd: string,
    filters?: string | null
  ): Promise<HistogramSeries[] | null> {
    return this.adapter.getPingHistogram(request, dateRangeStart, dateRangeEnd, filters);
  }

  public async getDocCount(request: any): Promise<DocCount> {
    return this.adapter.getDocCount(request);
  }
}
